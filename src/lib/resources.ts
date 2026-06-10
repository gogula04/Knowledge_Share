import { query, transaction } from "@/lib/db";
import { type AuthUser } from "@/lib/auth";
import { type AccessScope, type ResourceSummary, type SourceType, type WorkspaceType } from "@/lib/types";
import { estimateFreshnessDays } from "@/lib/chunking";
import { deleteStoredFile } from "@/lib/storage";

export type ResourceFilter = {
  workspaceType?: WorkspaceType | "all";
  teamId?: string | "all";
  category?: string | "all";
  tag?: string | "all";
  sourceType?: SourceType | "all";
  freshness?: "fresh" | "stale" | "all";
  search?: string;
  limit?: number;
  offset?: number;
};

function freshStatus(lastIndexedAt: string | null) {
  if (!lastIndexedAt) return "unknown" as const;
  return estimateFreshnessDays(lastIndexedAt) <= 30 ? ("fresh" as const) : ("stale" as const);
}

export function isDatabaseUnavailable(error: unknown) {
  const queue: unknown[] = [error];
  const seen = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) {
      continue;
    }
    seen.add(current);

    const candidate = current as { code?: unknown; message?: unknown; cause?: unknown; errors?: unknown };
    const code = typeof candidate.code === "string" ? candidate.code : "";
    const message = typeof candidate.message === "string" ? candidate.message : "";
    if (
      code === "ECONNREFUSED" ||
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ENOTFOUND" ||
      message.includes("ECONNREFUSED") ||
      message.includes("pool.connect")
    ) {
      return true;
    }

    if (candidate.cause && typeof candidate.cause === "object") {
      queue.push(candidate.cause);
    }

    if (Array.isArray(candidate.errors)) {
      queue.push(...candidate.errors);
    }
  }

  return false;
}

export async function getWorkspaceOverview(user: AuthUser) {
  try {
    const teamRows = await query<{
      team_id: string;
      team_name: string;
      team_slug: string;
      resource_count: number;
      lead_user_id: string | null;
      member_count: number;
    }>(
      `select
         t.id as team_id,
         t.name as team_name,
         t.slug as team_slug,
         t.lead_user_id,
         count(distinct d.id)::int as resource_count,
         count(distinct ut.user_id)::int as member_count
       from user_teams my_team
       join teams t on t.id = my_team.team_id
       left join workspaces w on w.team_id = t.id and w.type = 'team'
       left join documents d on d.team_id = t.id and d.is_active = true
       left join user_teams ut on ut.team_id = t.id
       where my_team.user_id = $1
       group by t.id, t.name, t.slug, t.lead_user_id
       order by t.name asc`,
      [user.id]
    );

    const commonRows = await query<{
      workspace_id: string;
      workspace_name: string;
      resource_count: number;
    }>(
      `select
         w.id as workspace_id,
         w.name as workspace_name,
         count(d.id)::int as resource_count
       from workspaces w
       left join documents d on d.workspace_id = w.id and d.is_active = true
       where w.type = 'common'
       group by w.id, w.name
       order by w.name asc`,
      []
    );

    return {
      teamWorkspaces: teamRows,
      commonWorkspace: commonRows[0] ?? null
    };
  } catch {
    return {
      teamWorkspaces: [],
      commonWorkspace: null
    };
  }
}

export async function getDashboardData(user: AuthUser) {
  try {
    const teams = await query<{
      team_id: string;
      team_name: string;
      team_slug: string;
      is_lead: boolean;
      resource_count: number;
      member_count: number;
    }>(
      `select
         t.id as team_id,
         t.name as team_name,
         t.slug as team_slug,
         bool_or(ut.is_lead) as is_lead,
         count(distinct d.id)::int as resource_count,
         count(distinct member.user_id)::int as member_count
       from user_teams ut
       join teams t on t.id = ut.team_id
       left join documents d on d.team_id = t.id and d.is_active = true
       left join user_teams member on member.team_id = t.id
       where ut.user_id = $1
       group by t.id, t.name, t.slug
       order by t.name asc`,
      [user.id]
    );

    const accessibleTeamIds = teams.map((team) => team.team_id);

    const totalResources = await query<{ count: number }>(
      `select count(*)::int as count
       from documents
       where is_active = true
         and (
           workspace_type = 'common'
           or team_id = any($1::uuid[])
         )`,
      [accessibleTeamIds]
    );

    const staleResources = await query<{ count: number }>(
      `select count(*)::int as count
       from documents
       where is_active = true
         and last_indexed_at is not null
         and now() - last_indexed_at > interval '30 days'
         and (
           workspace_type = 'common'
           or team_id = any($1::uuid[])
         )`,
      [accessibleTeamIds]
    );

    const searches = await query<{ question: string; created_at: string }>(
      `select question, created_at
       from search_analytics
       where user_id = $1
       order by created_at desc
       limit 5`,
      [user.id]
    );

    const pinnedResources = await query<{
      id: string;
      title: string;
      source_type: string;
      workspace_type: string;
      team_name: string | null;
      team_id: string | null;
      original_source_link: string | null;
      fresh_status: string;
      last_indexed_at: string | null;
      source_authority_level: number;
      summary: string | null;
    }>(
      `select
         d.id,
         d.title,
         d.source_type,
         d.workspace_type,
         t.name as team_name,
         d.team_id,
         d.original_source_link,
         d.fresh_status,
         d.last_indexed_at,
         d.source_authority_level,
         d.summary
       from resource_pins rp
       join documents d on d.id = rp.document_id
       left join teams t on t.id = d.team_id
       where rp.user_id = $1
       order by rp.created_at desc`,
      [user.id]
    );

    return {
      teams,
      totalResources: totalResources[0]?.count ?? 0,
      staleResources: staleResources[0]?.count ?? 0,
      recentSearches: searches,
      pinnedResources,
      teamWorkspaceCount: teams.length,
      commonWorkspaceCount: 1
    };
  } catch {
    return {
      teams: [],
      totalResources: 0,
      staleResources: 0,
      recentSearches: [],
      pinnedResources: [],
      teamWorkspaceCount: 0,
      commonWorkspaceCount: 0
    };
  }
}

export async function listResources(user: AuthUser, filter: ResourceFilter = {}) {
  try {
    const workspaceType = filter.workspaceType ?? "all";
    const freshness = filter.freshness ?? "all";
    const limit = filter.limit ?? 30;
    const offset = filter.offset ?? 0;
    const whereClauses: string[] = ["d.is_active = true"];
    const params: unknown[] = [];
    let index = 1;

    const teams = await query<{ team_id: string }>(
      `select team_id from user_teams where user_id = $1`,
      [user.id]
    );
    const teamIds = teams.map((team) => team.team_id);

    if (user.role !== "admin") {
      whereClauses.push(`(d.workspace_type = 'common' or d.team_id = any($${index++}::uuid[]))`);
      params.push(teamIds);
    }

    if (workspaceType !== "all") {
      whereClauses.push(`d.workspace_type = $${index++}`);
      params.push(workspaceType);
    }

    if (filter.teamId && filter.teamId !== "all") {
      whereClauses.push(`d.team_id = $${index++}`);
      params.push(filter.teamId);
    }

    if (filter.category && filter.category !== "all") {
      whereClauses.push(`coalesce(d.category, '') = $${index++}`);
      params.push(filter.category);
    }

    if (filter.sourceType && filter.sourceType !== "all") {
      whereClauses.push(`d.source_type = $${index++}::source_type`);
      params.push(filter.sourceType);
    }

    if (filter.tag && filter.tag !== "all") {
      whereClauses.push(`$${index++} = any(d.tags)`);
      params.push(filter.tag);
    }

    if (filter.search) {
      whereClauses.push(`(d.title ilike $${index++} or coalesce(d.summary, '') ilike $${index++} or coalesce(d.original_source_link, '') ilike $${index++})`);
      const term = `%${filter.search}%`;
      params.push(term, term, term);
    }

    if (freshness === "fresh") {
      whereClauses.push(`(d.last_indexed_at is not null and now() - d.last_indexed_at <= interval '30 days')`);
    } else if (freshness === "stale") {
      whereClauses.push(`(d.last_indexed_at is null or now() - d.last_indexed_at > interval '30 days')`);
    }

    const rows = await query<{
      id: string;
      title: string;
      source_type: string;
      workspace_type: string;
      team_name: string | null;
      team_id: string | null;
      uploaded_by_name: string | null;
      created_at: string;
      last_indexed_at: string | null;
      original_source_link: string | null;
      file_name: string | null;
      category: string | null;
      tags: string[];
      access_scope: string;
      source_authority_level: number;
      fresh_status: string;
      summary: string | null;
      total_chunks: number;
    }>(
      `select
         d.id,
         d.title,
         d.source_type,
         d.workspace_type,
         t.name as team_name,
         d.team_id,
         d.uploaded_by_name,
         d.created_at,
         d.last_indexed_at,
         d.original_source_link,
         d.file_name,
         d.category,
         d.tags,
         d.access_scope,
         d.source_authority_level,
         d.fresh_status,
         d.summary,
         d.total_chunks
       from documents d
       left join teams t on t.id = d.team_id
       where ${whereClauses.join(" and ")}
       order by d.updated_at desc
       limit $${index++}
       offset $${index++}`,
      [...params, limit, offset]
    );

    const dbResources = rows.map((row) => ({
      id: row.id,
      title: row.title,
      sourceType: row.source_type as ResourceSummary["sourceType"],
      workspaceType: row.workspace_type as ResourceSummary["workspaceType"],
      teamName: row.team_name,
      uploadedBy: row.uploaded_by_name ?? "System",
      createdAt: row.created_at,
      lastIndexedAt: row.last_indexed_at,
      originalSourceLink: row.original_source_link,
      fileName: row.file_name,
      category: row.category,
      tags: row.tags ?? [],
      accessScope: row.access_scope as AccessScope,
      sourceAuthorityLevel: row.source_authority_level,
      freshStatus: freshStatus(row.last_indexed_at),
      excerpt: row.summary ?? `Indexed chunks: ${row.total_chunks}`
    })) satisfies ResourceSummary[];

    return dbResources;
  } catch {
    return [];
  }
}

export async function getResourceById(resourceId: string, user: AuthUser) {
  try {
    const rows = await query<{
      id: string;
      title: string;
      source_type: string;
      workspace_type: string;
      team_name: string | null;
      team_id: string | null;
      uploaded_by_name: string | null;
      created_at: string;
      last_indexed_at: string | null;
      original_source_link: string | null;
      file_name: string | null;
      category: string | null;
      tags: string[];
      access_scope: string;
      source_authority_level: number;
      fresh_status: string;
      summary: string | null;
      total_chunks: number;
    }>(
      `select
         d.id,
         d.title,
         d.source_type,
         d.workspace_type,
         t.name as team_name,
         d.team_id,
         d.uploaded_by_name,
         d.created_at,
         d.last_indexed_at,
         d.original_source_link,
         d.file_name,
         d.category,
         d.tags,
         d.access_scope,
         d.source_authority_level,
         d.fresh_status,
         d.summary,
         d.total_chunks
       from documents d
       left join teams t on t.id = d.team_id
       where d.id = $1
       limit 1`,
      [resourceId]
    );
    const row = rows[0];
    if (!row) return null;
    if (user.role !== "admin" && row.workspace_type !== "common") {
      const userTeamRows = await query<{ team_id: string }>(`select team_id from user_teams where user_id = $1`, [user.id]);
      const teamIds = userTeamRows.map((team) => team.team_id);
      if (!teamIds.includes(row.team_id ?? "")) {
        return null;
      }
    }
    return {
      id: row.id,
      title: row.title,
      sourceType: row.source_type as ResourceSummary["sourceType"],
      workspaceType: row.workspace_type as ResourceSummary["workspaceType"],
      teamName: row.team_name,
      uploadedBy: row.uploaded_by_name ?? "System",
      createdAt: row.created_at,
      lastIndexedAt: row.last_indexed_at,
      originalSourceLink: row.original_source_link,
      fileName: row.file_name,
      category: row.category,
      tags: row.tags ?? [],
      accessScope: row.access_scope as AccessScope,
      sourceAuthorityLevel: row.source_authority_level,
      freshStatus: freshStatus(row.last_indexed_at),
      excerpt: row.summary ?? `Indexed chunks: ${row.total_chunks}`
    } satisfies ResourceSummary;
  } catch {
    return null;
  }
}

export async function createResourceDocument(input: {
  title: string;
  workspaceType: WorkspaceType;
  teamId?: string | null;
  sourceType: SourceType;
  originalSourceLink?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  category?: string | null;
  tags?: string[];
  accessScope?: AccessScope;
  sourceAuthorityLevel?: number;
  uploadedBy?: AuthUser | null;
  uploadedByName?: string | null;
  summary?: string | null;
}) {
  try {
    const result = await transaction(async (client) => {
      const workspaceRows = await client.query<{ id: string }>(
        `select id from workspaces where type = $1 and ($2::uuid is null and team_id is null or team_id = $2::uuid) limit 1`,
        [input.workspaceType, input.teamId ?? null]
      );

      let workspaceId = workspaceRows.rows[0]?.id ?? null;
      if (!workspaceId) {
        const insertWorkspace = await client.query<{ id: string }>(
          `insert into workspaces (type, name, description, team_id)
           values ($1, $2, $3, $4)
           returning id`,
          [
            input.workspaceType,
            input.workspaceType === "common" ? "Common Workspace" : "Team Workspace",
            input.workspaceType === "common" ? "Shared engineering knowledge" : "Team-specific engineering knowledge",
            input.teamId ?? null
          ]
        );
        workspaceId = insertWorkspace.rows[0].id;
      }

      const insertDocument = await client.query<{
        id: string;
      }>(
        `insert into documents (
           workspace_id, workspace_type, team_id, title, source_type, original_source_link, file_name, file_path,
           category, tags, access_scope, source_authority_level, uploaded_by, uploaded_by_name, summary, fresh_status
         )
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'unknown')
         returning id`,
        [
          workspaceId,
          input.workspaceType,
          input.teamId ?? null,
          input.title,
          input.sourceType,
          input.originalSourceLink ?? null,
          input.fileName ?? null,
          input.filePath ?? null,
          input.category ?? null,
          input.tags ?? [],
          input.accessScope ?? (input.workspaceType === "common" ? "common" : "team"),
          input.sourceAuthorityLevel ?? (input.workspaceType === "common" ? 5 : 4),
          input.uploadedBy?.id ?? null,
          input.uploadedByName ?? input.uploadedBy?.displayName ?? null,
          input.summary ?? null
        ]
      );

      await client.query(
        `insert into ingestion_jobs (document_id, job_type, status, payload)
         values ($1, 'ingest', 'queued', $2::jsonb)`,
        [insertDocument.rows[0].id, JSON.stringify({})]
      );

      return insertDocument.rows[0].id;
    });

    return result;
  } catch (error) {
    throw error;
  }
}

export async function markResourceDeleted(resourceId: string, user: AuthUser) {
  try {
    await transaction(async (client) => {
      const rows = await client.query<{ file_path: string | null }>(
        `select file_path from documents where id = $1`,
        [resourceId]
      );
      await client.query(`update documents set is_active = false, updated_at = now() where id = $1`, [resourceId]);
      await client.query(`delete from document_chunks where document_id = $1`, [resourceId]);
      await client.query(`delete from resource_pins where document_id = $1`, [resourceId]);
      await client.query(
        `insert into audit_logs (actor_user_id, action, resource_type, resource_id, payload)
        values ($1, 'delete_resource', 'document', $2, $3::jsonb)`,
        [user.id, resourceId, JSON.stringify({ deletedBy: user.email })]
      );
      const filePath = rows.rows[0]?.file_path ?? null;
      if (filePath) {
        await deleteStoredFile(filePath);
      }
    });
  } catch (error) {
    throw error;
  }
}

export async function reindexResource(resourceId: string, user: AuthUser) {
  try {
    await query(
      `insert into ingestion_jobs (document_id, job_type, status, payload)
       values ($1, 'reindex', 'queued', $2::jsonb)`,
      [resourceId, JSON.stringify({ requestedBy: user.id })]
    );
  } catch (error) {
    throw error;
  }
}
