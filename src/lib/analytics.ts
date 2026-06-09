import { query } from "@/lib/db";
import { type AuthUser } from "@/lib/auth";
import { getUserTeams } from "@/lib/permissions";
import { recentSearches } from "@/lib/sample-data";

function buildDemoAnalyticsFallback() {
  return {
    mostSearchedTopics: recentSearches.map((question, index) => ({
      question,
      count: Math.max(1, recentSearches.length - index)
    })),
    unansweredQuestions: [],
    staleDocs: [],
    mostUsedDocuments: [],
    documentationGaps: [],
    teamUsage: []
  };
}

export async function getAnalyticsOverview(user: AuthUser) {
  try {
    const teams = await getUserTeams(user.id);
    const teamIds = teams.map((team) => team.id);

    const searches = await query<{
      question: string;
      count: number;
    }>(
      `select question, count(*)::int as count
       from search_analytics
       where user_id = $1
       group by question
       order by count(*) desc, question asc
       limit 8`,
      [user.id]
    );

    const unanswered = await query<{
      question: string;
      reason: string;
      workspace_scope: string;
      created_at: string;
    }>(
      `select question, reason, workspace_scope, created_at
       from unanswered_questions
       where user_id = $1 or user_id is null
       order by created_at desc
       limit 8`,
      [user.id]
    );

    const staleDocs = await query<{
      id: string;
      title: string;
      workspace_type: string;
      team_name: string | null;
      last_indexed_at: string | null;
      source_authority_level: number;
    }>(
      `select d.id, d.title, d.workspace_type, t.name as team_name, d.last_indexed_at, d.source_authority_level
       from documents d
       left join teams t on t.id = d.team_id
       where d.is_active = true
         and d.last_indexed_at is not null
         and now() - d.last_indexed_at > interval '30 days'
         and (
           d.workspace_type = 'common'
           or d.team_id = any($1::uuid[])
         )
       order by d.last_indexed_at asc
       limit 8`,
      [teamIds]
    );

    const mostUsedDocuments = await query<{
      document_id: string;
      title: string;
      search_count: number;
      workspace_type: string;
      team_name: string | null;
    }>(
      `select
         sa.top_document_ids[1] as document_id,
         d.title,
         count(*)::int as search_count,
         d.workspace_type,
         t.name as team_name
       from search_analytics sa
       join documents d on d.id = sa.top_document_ids[1]::uuid
       left join teams t on t.id = d.team_id
       where sa.user_id = $1
       group by sa.top_document_ids[1], d.title, d.workspace_type, t.name
       order by search_count desc
       limit 8`,
      [user.id]
    );

    const gaps = await query<{
      question: string;
      count: number;
    }>(
      `select question, count(*)::int as count
       from unanswered_questions
       group by question
       order by count(*) desc
       limit 8`
    );

    const teamUsage = await query<{
      workspace_scope: string;
      search_count: number;
    }>(
      `select workspace_scope, count(*)::int as search_count
       from search_analytics
       where user_id = $1
       group by workspace_scope
       order by search_count desc`,
      [user.id]
    );

    return {
      mostSearchedTopics: searches.length ? searches : buildDemoAnalyticsFallback().mostSearchedTopics,
      unansweredQuestions: unanswered,
      staleDocs,
      mostUsedDocuments,
      documentationGaps: gaps,
      teamUsage
    };
  } catch {
    return buildDemoAnalyticsFallback();
  }
}
