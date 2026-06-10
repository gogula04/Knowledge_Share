import { query, transaction } from "@/lib/db";
import { type AuthUser } from "@/lib/auth";
import { answerQuestion } from "@/lib/rag";
import { type ChatAnswer, type WorkspaceScope } from "@/lib/types";
import { isDatabaseUnavailable } from "@/lib/resources";

export async function listChatSessions(user: AuthUser) {
  return query<{
    id: string;
    title: string;
    workspace_scope: string;
    selected_team_id: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `select id, title, workspace_scope, selected_team_id, created_at, updated_at
     from chat_sessions
     where user_id = $1
     order by updated_at desc
     limit 20`,
    [user.id]
  );
}

export async function getChatMessages(sessionId: string, user: AuthUser) {
  const rows = await query<{
    id: string;
    role: string;
    content: string;
    citations: unknown;
    metadata: unknown;
    created_at: string;
  }>(
    `select m.id, m.role, m.content, m.citations, m.metadata, m.created_at
     from chat_messages m
     join chat_sessions s on s.id = m.session_id
     where m.session_id = $1 and s.user_id = $2
     order by created_at asc`,
    [sessionId, user.id]
  );
  return rows;
}

export async function createOrUpdateChatSession(input: {
  user: AuthUser;
  sessionId?: string | null;
  title?: string;
  workspaceScope: WorkspaceScope;
  teamId?: string | null;
}) {
  if (input.sessionId) {
    const updated = await query<{ id: string }>(
      `update chat_sessions
       set workspace_scope = $2, selected_team_id = $3, updated_at = now()
       where id = $1 and user_id = $4
       returning id`,
      [input.sessionId, input.workspaceScope, input.teamId ?? null, input.user.id]
    );
    if (updated[0]?.id) {
      return updated[0].id;
    }
  }

  const rows = await query<{ id: string }>(
    `insert into chat_sessions (user_id, title, workspace_scope, selected_team_id)
     values ($1, $2, $3, $4)
     returning id`,
    [input.user.id, input.title ?? "New conversation", input.workspaceScope, input.teamId ?? null]
  );
  return rows[0].id;
}

export async function askKnowledgeQuestion(input: {
  user: AuthUser;
  question: string;
  workspaceScope: WorkspaceScope;
  teamId?: string | null;
  sessionId?: string | null;
}) {
  const answer = await answerQuestion({
    user: input.user,
    question: input.question,
    scope: input.workspaceScope,
    teamId: input.teamId ?? null
  });

  let sessionId: string | null = input.sessionId ?? null;
  try {
    sessionId = await createOrUpdateChatSession({
      user: input.user,
      sessionId: input.sessionId,
      title: input.question.slice(0, 56),
      workspaceScope: input.workspaceScope,
      teamId: input.teamId ?? null
    });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }
  }

  try {
    await transaction(async (client) => {
      await client.query(
        `insert into chat_messages (session_id, user_id, role, content)
         values ($1, $2, 'user', $3)
         returning id`,
        [sessionId, input.user.id, input.question]
      );

      const assistantMessage = await client.query<{ id: string }>(
        `insert into chat_messages (session_id, role, content, citations, metadata)
         values ($1, 'assistant', $2, $3::jsonb, $4::jsonb)
         returning id`,
        [
          sessionId,
          answer.answer,
          JSON.stringify(answer.citations),
          JSON.stringify({
            confidence: answer.confidence,
            staleWarning: answer.staleWarning,
            noRelevantInfo: answer.noRelevantInfo,
            followUps: answer.followUps,
            conflicts: answer.conflicts,
            usedWorkspaces: answer.usedWorkspaces
          })
        ]
      );

      for (const [index, citation] of answer.citations.entries()) {
        await client.query(
          `insert into source_citations (message_id, document_id, chunk_id, citation_order, snippet, source_link, confidence)
           values ($1, $2, null, $3, $4, $5, $6)`,
          [
            assistantMessage.rows[0].id,
            citation.documentId,
            index + 1,
            citation.snippet,
            citation.sourceLink,
            answer.confidence === "high" ? 0.95 : answer.confidence === "medium" ? 0.75 : 0.5
          ]
        );
      }
    });
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }
  }

  try {
    await query(
      `insert into search_analytics (user_id, session_id, question, workspace_scope, top_document_ids, result_count, confidence)
       values ($1, $2, $3, $4, $5::text[], $6, $7)`,
      [
        input.user.id,
        sessionId,
        input.question,
        input.workspaceScope,
        answer.citations.map((citation) => citation.documentId),
        answer.citations.length,
        answer.confidence
      ]
    );
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }
  }

  if (answer.noRelevantInfo) {
    try {
      await query(
        `insert into unanswered_questions (question, user_id, workspace_scope, reason)
         values ($1, $2, $3, $4)`,
        [input.question, input.user.id, input.workspaceScope, "No sufficiently relevant indexed sources were found."]
      );
    } catch (error) {
      if (!isDatabaseUnavailable(error)) {
        throw error;
      }
    }
  }

  return {
    sessionId,
    answer
  };
}

export async function getChatOverview(user: AuthUser) {
  try {
    const sessions = await listChatSessions(user);
    const latestSession = sessions[0] ?? null;
    const recentMessages = latestSession ? await getChatMessages(latestSession.id, user) : [];
    return {
      sessions,
      latestSession,
      recentMessages
    };
  } catch {
    return {
      sessions: [],
      latestSession: null,
      recentMessages: []
    };
  }
}
