import { query } from "@/lib/db";
import { seedTeams, seedUsers } from "@/lib/sample-data";

async function main() {
  console.log("[seed] resetting demo data");
  await query(
    `truncate table
       resource_pins,
       search_analytics,
       unanswered_questions,
       source_citations,
       chat_messages,
       chat_sessions,
       ingestion_jobs,
       document_chunks,
       documents,
       workspaces,
       user_teams,
       teams,
       users
     restart identity cascade`
  );

  const createdUsers: Record<string, { id: string; email: string; display_name: string; role: string }> = {};
  for (const user of seedUsers) {
    const rows = await query<{
      id: string;
      email: string;
      display_name: string;
      role: string;
    }>(
      `insert into users (email, password_hash, display_name, role, is_active)
       values ($1, $2, $3, $4::user_role, true)
       returning id, email, display_name, role`,
      [user.email, "role-session-only", user.displayName, user.role]
    );
    createdUsers[user.email] = rows[0];
  }

  const createdTeams: Record<string, { id: string; name: string; slug: string }> = {};
  for (const team of seedTeams) {
    const rows = await query<{ id: string; name: string; slug: string }>(
      `insert into teams (name, slug, description, lead_user_id)
       values ($1, $2, $3, $4)
       returning id, name, slug`,
      [team.name, team.slug, team.description, createdUsers["lead@fms.local"].id]
    );
    createdTeams[team.name] = rows[0];
  }

  await query(
    `insert into user_teams (user_id, team_id, is_lead, member_title)
     values
       ($1, $2, true, 'Team Lead'),
       ($3, $2, false, 'Platform Engineer'),
       ($4, $2, false, 'Admin Sponsor')
     on conflict (user_id, team_id) do update
     set is_lead = excluded.is_lead,
         member_title = excluded.member_title`,
    [
      createdUsers["lead@fms.local"].id,
      createdTeams["Foundation and Framework"].id,
      createdUsers["engineer@fms.local"].id,
      createdUsers["admin@fms.local"].id
    ]
  );

  await query(
    `insert into workspaces (type, name, description, team_id)
     values
       ('team', 'Team Workspace', 'Team-specific engineering knowledge', $1),
       ('common', 'Common Workspace', 'Shared engineering knowledge', null)
     on conflict do nothing`,
    [createdTeams["Foundation and Framework"].id]
  );

  console.log("[seed] demo data ready");
}

main().catch((error) => {
  console.error("[seed] failed", error);
  process.exit(1);
});
