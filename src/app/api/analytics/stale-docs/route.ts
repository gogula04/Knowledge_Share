import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getUserTeams } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teamIds = (await getUserTeams(user.id)).map((team) => team.id);
  const rows = await query<{
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
     limit 20`,
    [teamIds]
  );

  return NextResponse.json({ staleDocs: rows });
}

