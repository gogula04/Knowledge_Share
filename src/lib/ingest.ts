import { query, transaction, vectorLiteral } from "@/lib/db";
import { chunkText } from "@/lib/chunking";
import { embedTexts } from "@/lib/embeddings";
import { extractTextFromResource } from "@/lib/extract";
import { type AuthUser } from "@/lib/auth";
import { deleteStoredFile } from "@/lib/storage";

function inferFreshStatus(lastIndexedAt: Date) {
  return "fresh" as const;
}

function tokenEstimate(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function processIngestionJob(jobId: string, options: { workerUser?: AuthUser | null } = {}) {
  return transaction(async (client) => {
    const jobRows = await client.query<{
      id: string;
      document_id: string;
      job_type: string;
      attempts: number;
      payload: unknown;
    }>(
      `select id, document_id, job_type, attempts, payload
       from ingestion_jobs
       where id = $1
       for update`,
      [jobId]
    );
    const job = jobRows.rows[0];
    if (!job) {
      throw new Error(`Ingestion job ${jobId} not found`);
    }

    await client.query(`update ingestion_jobs set status = 'processing', started_at = coalesce(started_at, now()), attempts = attempts + 1, updated_at = now() where id = $1`, [
      jobId
    ]);

    const documentRows = await client.query<{
      id: string;
      title: string;
      original_source_link: string | null;
      file_path: string | null;
      file_name: string | null;
      workspace_type: string;
      team_id: string | null;
      source_type: string;
    }>(
      `select id, title, original_source_link, file_path, file_name, workspace_type, team_id, source_type
       from documents
       where id = $1
       for update`,
      [job.document_id]
    );
    const document = documentRows.rows[0];
    if (!document) {
      throw new Error(`Document ${job.document_id} not found`);
    }

    const rawText = await extractTextFromResource({
      filePath: document.file_path ?? null,
      sourceUrl: document.original_source_link ?? null
    });

    if (!rawText.trim()) {
      throw new Error(`No text could be extracted for document ${document.title}`);
    }

    const chunks = chunkText(rawText, { maxLength: 900, overlap: 120 }).map((content, index) => ({
      content,
      chunk_index: index,
      token_count: tokenEstimate(content),
      section_heading: content.split("\n")[0]?.replace(/^#\s*/, "").trim() ?? null
    }));

    await client.query(`delete from document_chunks where document_id = $1`, [document.id]);

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const embedding = embeddings[index] ?? embeddings[0] ?? [];
      await client.query(
        `insert into document_chunks (
           document_id, chunk_index, content, section_heading, token_count, embedding, metadata
         ) values ($1, $2, $3, $4, $5, $6::vector, $7::jsonb)`,
        [
          document.id,
          chunk.chunk_index,
          chunk.content,
          chunk.section_heading,
          chunk.token_count,
          vectorLiteral(embedding),
          JSON.stringify({
            jobId,
            worker: options.workerUser?.email ?? "system",
            sourceType: document.source_type
          })
        ]
      );
    }

    const summary = rawText.slice(0, 600).replace(/\s+/g, " ").trim();

    await client.query(
      `update documents
       set summary = $2,
           total_chunks = $3,
           last_indexed_at = now(),
           fresh_status = $4,
           last_error = null,
           updated_at = now()
       where id = $1`,
      [document.id, summary, chunks.length, inferFreshStatus(new Date())]
    );

    await client.query(
      `update ingestion_jobs
       set status = 'complete',
           completed_at = now(),
           updated_at = now(),
           last_error = null
       where id = $1`,
      [jobId]
    );

    await client.query(
      `insert into audit_logs (actor_user_id, action, resource_type, resource_id, payload)
       values ($1, 'ingest_resource', 'document', $2, $3::jsonb)`,
      [options.workerUser?.id ?? null, document.id, JSON.stringify({ chunks: chunks.length, summaryLength: summary.length })]
    );

    return {
      documentId: document.id,
      chunkCount: chunks.length,
      summary
    };
  }).catch(async (error) => {
    await query(`update ingestion_jobs set status = 'failed', completed_at = now(), last_error = $2, updated_at = now() where id = $1`, [
      jobId,
      error instanceof Error ? error.message : String(error)
    ]);
    throw error;
  });
}

export async function processQueuedIngestionJobs(limit = 5, options: { workerUser?: AuthUser | null } = {}) {
  const jobs = await query<{ id: string }>(
    `select id from ingestion_jobs
     where status = 'queued'
       and scheduled_at <= now()
     order by created_at asc
     limit $1`,
    [limit]
  );

  const results = [];
  for (const job of jobs) {
    try {
      results.push(await processIngestionJob(job.id, options));
    } catch {
      results.push(null);
    }
  }
  return results;
}

