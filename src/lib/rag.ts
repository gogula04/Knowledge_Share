import OpenAI from "openai";
import { env } from "@/lib/env";
import { query, vectorLiteral } from "@/lib/db";
import { embedText } from "@/lib/embeddings";
import { estimateFreshnessDays } from "@/lib/chunking";
import { type AuthUser } from "@/lib/auth";
import { type ChatAnswer, type ChatCitation, type RetrievedChunk, type WorkspaceScope } from "@/lib/types";
import { getUserTeams } from "@/lib/permissions";

const poolside = env.POOLSIDE_API_KEY
  ? new OpenAI({
      apiKey: env.POOLSIDE_API_KEY,
      baseURL: env.POOLSIDE_API_BASE ?? "https://api.poolside.ai/openai/v1"
    })
  : null;
const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
const staleThresholdDays = env.STALE_DAYS_DEFAULT;

type RetrievalInput = {
  user: AuthUser;
  question: string;
  scope: WorkspaceScope;
  teamId?: string | null;
  maxResults?: number;
};

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
}

function tokenOverlap(question: string, text: string) {
  const questionTokens = new Set(
    normalize(question)
      .split(/\s+/)
      .filter((token) => token.length > 3)
  );
  if (questionTokens.size === 0) return 0;
  const words = normalize(text)
    .split(/\s+/)
    .filter(Boolean);
  let overlap = 0;
  for (const word of words) {
    if (questionTokens.has(word)) overlap += 1;
  }
  return overlap / Math.max(words.length, 1);
}

function freshnessWeight(lastIndexedAt: string | null) {
  if (!lastIndexedAt) return -0.08;
  const age = estimateFreshnessDays(lastIndexedAt);
  if (age <= staleThresholdDays) return 0.09;
  if (age <= staleThresholdDays * 2) return 0.02;
  if (age <= staleThresholdDays * 4) return -0.05;
  return -0.12;
}

function authorityWeight(authority: number) {
  const normalized = Math.min(Math.max(authority, 1), 5);
  return (normalized - 3) * 0.03;
}

function workspaceWeight(scope: WorkspaceScope, workspaceType: string, selectedTeamId: string | null | undefined, documentTeamId: string | null) {
  if (scope === "common" && workspaceType === "common") return 0.12;
  if (scope === "team" && workspaceType === "team") {
    if (!selectedTeamId || selectedTeamId === documentTeamId) return 0.12;
    return 0.03;
  }
  if (scope === "both") {
    if (workspaceType === "common") return 0.06;
    if (selectedTeamId && selectedTeamId === documentTeamId) return 0.12;
    return 0.05;
  }
  return 0;
}

function extractKeywords(text: string) {
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token.length > 3)
    .slice(0, 12);
}

function buildConflictHint(chunks: RetrievedChunk[]) {
  if (chunks.length < 2) return [];
  const top = chunks.slice(0, 4);
  const hints: string[] = [];
  for (let left = 0; left < top.length; left += 1) {
    for (let right = left + 1; right < top.length; right += 1) {
      const a = top[left];
      const b = top[right];
      if (a.documentId === b.documentId) continue;
      const shared = extractKeywords(a.title)
        .filter((token) => extractKeywords(b.title).includes(token))
        .length;
      const aLegacy = /deprecated|legacy|old|archived|outdated/i.test(a.text);
      const bLegacy = /deprecated|legacy|old|archived|outdated/i.test(b.text);
      const aCurrent = /latest|current|updated|new/i.test(a.text);
      const bCurrent = /latest|current|updated|new/i.test(b.text);
      if (shared >= 2 && ((aLegacy && bCurrent) || (bLegacy && aCurrent))) {
        hints.push(`Potential conflict between "${a.title}" and "${b.title}".`);
      }
    }
  }
  return hints.slice(0, 2);
}

export async function retrieveRelevantChunks({
  user,
  question,
  scope,
  teamId,
  maxResults = 8
}: RetrievalInput) {
  const embedding = await embedText(question);
  const teams = await getUserTeams(user.id);
  const teamIds = teams.map((team) => team.id);
  const activeTeamIds = scope === "common" ? [] : teamId ? teamIds.filter((id) => id === teamId) : teamIds;
  const includeCommon = scope === "team" ? false : true;

  const rows = await query<{
    chunk_id: string;
    chunk_index: number;
    text: string;
    semantic_score: number;
    document_id: string;
    title: string;
    source_type: string;
    workspace_type: string;
    team_name: string | null;
    team_id: string | null;
    source_link: string | null;
    authority: number;
    last_indexed_at: string | null;
    category: string | null;
    tags: string[];
    fresh_status: string | null;
  }>(
    `with candidate_chunks as (
       select
         dc.id as chunk_id,
         dc.chunk_index,
         dc.content as text,
         1 - (dc.embedding <=> $1::vector) as semantic_score,
         d.id as document_id,
         d.title,
         d.source_type,
         d.workspace_type,
         t.name as team_name,
         d.team_id,
         d.original_source_link as source_link,
         d.source_authority_level as authority,
         d.last_indexed_at,
         d.category,
         d.tags,
         d.fresh_status
       from document_chunks dc
       join documents d on d.id = dc.document_id
       left join teams t on t.id = d.team_id
         where d.is_active = true
         and (
           ($2::boolean = true and d.workspace_type = 'common')
           or
           ($3::uuid[] <> '{}'::uuid[] and d.workspace_type = 'team' and d.team_id = any($3::uuid[]))
         )
       order by dc.embedding <=> $1::vector asc
       limit 24
     )
     select * from candidate_chunks`,
    [vectorLiteral(embedding), includeCommon, activeTeamIds]
  );

  const ranked: RetrievedChunk[] = rows.map((row) => {
    const freshness = freshnessWeight(row.last_indexed_at);
    const authority = authorityWeight(row.authority);
    const keyword = tokenOverlap(question, row.title + " " + row.text + " " + row.category + " " + row.tags.join(" "));
    const workspace = workspaceWeight(scope, row.workspace_type, teamId, row.team_id);
    const semanticScore = Number(row.semantic_score);
    const totalScore = semanticScore * 0.68 + freshness + authority + workspace + keyword * 0.25;
    return {
      chunkId: row.chunk_id,
      chunkIndex: row.chunk_index,
      documentId: row.document_id,
      title: row.title,
      sourceLink: row.source_link,
      sourceType: row.source_type as RetrievedChunk["sourceType"],
      workspaceType: row.workspace_type as RetrievedChunk["workspaceType"],
      teamName: row.team_name,
      snippet: row.text.slice(0, 280),
      authority: row.authority,
      freshness: row.fresh_status ?? (estimateFreshnessDays(row.last_indexed_at) <= staleThresholdDays ? "fresh" : "stale"),
      semanticScore,
      totalScore,
      text: row.text
    };
  });

  return ranked
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, maxResults);
}

function buildExtractiveAnswer(question: string, chunks: RetrievedChunk[], noRelevantInfo: boolean) {
  if (noRelevantInfo || chunks.length === 0) {
    return {
      answer:
        "I couldn’t find enough indexed evidence in the accessible workspaces to answer that confidently. Add or re-index a team or common resource that covers this topic, then ask again.",
      confidence: "low" as const
    };
  }

  const top = chunks.slice(0, 3);
  const lines = top.map((chunk) => `- ${chunk.title}: ${chunk.snippet.replace(/\s+/g, " ").trim()}`);
  return {
    answer: `Based on the indexed sources, the best available answer for "${question}" is:\n\n${lines.join("\n")}\n\nI’m keeping this scoped to the retrieved evidence only.`,
    confidence: top[0]?.totalScore > 0.55 ? ("high" as const) : ("medium" as const)
  };
}

function buildCitations(chunks: RetrievedChunk[]): ChatCitation[] {
  const unique = new Map<string, ChatCitation>();
  for (const chunk of chunks) {
    if (!unique.has(chunk.documentId)) {
      unique.set(chunk.documentId, {
        documentId: chunk.documentId,
        title: chunk.title,
        sourceLink: chunk.sourceLink,
        sourceType: chunk.sourceType,
        workspaceType: chunk.workspaceType,
        teamName: chunk.teamName,
        snippet: chunk.snippet,
        authority: chunk.authority,
        freshness: chunk.freshness
      });
    }
  }
  return [...unique.values()];
}

function followUpSuggestions(question: string, chunks: RetrievedChunk[], scope: WorkspaceScope) {
  const topTitles = chunks.slice(0, 3).map((chunk) => chunk.title);
  const suggestions = new Set<string>();
  if (scope !== "common") {
    suggestions.add("Show me only Common Workspace sources.");
  }
  if (scope !== "team") {
    suggestions.add("Show me only Team Workspace sources.");
  }
  if (topTitles[0]) {
    suggestions.add(`Tell me more about ${topTitles[0]}.`);
  }
  if (/install|setup|onboarding/i.test(question)) {
    suggestions.add("What should I do if a setup step fails?");
  }
  if (/docker/i.test(question)) {
    suggestions.add("What are the latest Docker troubleshooting steps?");
  }
  return [...suggestions].slice(0, 4);
}

async function generateLLMAnswer(question: string, chunks: RetrievedChunk[], scope: WorkspaceScope) {
  const client = poolside ?? openai;
  if (!client) return null;
  if (chunks.length === 0) return null;

  const response = await client.chat.completions.create({
    model: poolside ? env.POOLSIDE_MODEL : env.OPENAI_CHAT_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are ${poolside ? `the ${env.POOLSIDE_AGENT} agent for FMS Knowledge Workspace` : "FMS Knowledge Workspace"}, an internal knowledge assistant. Answer only from the provided sources. If evidence is insufficient, say so clearly. Always include citations by documentId. Do not infer unsupported facts. Mention stale or conflicting sources when relevant. Return JSON with keys: answer, confidence, citations, staleWarning, conflicts, noRelevantInfo, followUps.`
      },
      {
        role: "user",
        content: JSON.stringify({
          question,
          scope,
          sources: chunks.map((chunk, index) => ({
            index,
            documentId: chunk.documentId,
            title: chunk.title,
            sourceLink: chunk.sourceLink,
            workspaceType: chunk.workspaceType,
            teamName: chunk.teamName,
            authority: chunk.authority,
            freshness: chunk.freshness,
            snippet: chunk.snippet
          }))
        })
      }
    ]
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;

  try {
    return JSON.parse(content) as Partial<ChatAnswer>;
  } catch {
    return null;
  }
}

export async function answerQuestion(input: RetrievalInput) {
  const chunks = await retrieveRelevantChunks(input);
  const citations = buildCitations(chunks);
  const noRelevantInfo = chunks.length === 0 || (chunks[0]?.semanticScore ?? 0) < 0.18;
  const extractive = buildExtractiveAnswer(input.question, chunks, noRelevantInfo);
  const llm = await generateLLMAnswer(input.question, chunks, input.scope);
  const conflicts = buildConflictHint(chunks);
  const staleWarning = chunks.some((chunk) => chunk.freshness !== "fresh");
  const confidence = llm?.confidence && ["high", "medium", "low"].includes(llm.confidence) ? (llm.confidence as ChatAnswer["confidence"]) : extractive.confidence;
  const followUps = (llm?.followUps?.length ? llm.followUps : followUpSuggestions(input.question, chunks, input.scope)).slice(0, 4);

  const answer =
    typeof llm?.answer === "string" && llm.answer.trim().length > 0
      ? llm.answer
      : extractive.answer;

  return {
    answer,
    citations,
    followUps,
    conflicts: llm?.conflicts?.length ? llm.conflicts : conflicts,
    staleWarning: Boolean(llm?.staleWarning ?? staleWarning),
    confidence,
    noRelevantInfo,
    usedWorkspaces: [input.scope]
  } satisfies ChatAnswer;
}
