import { query } from "@/lib/db";
import { type AuthUser } from "@/lib/auth";

const fallbackRoles = [
  { key: "normal", name: "Team Member", description: "Can browse and ask questions." },
  { key: "team_lead", name: "Team Lead", description: "Can curate a team workspace." },
  { key: "admin", name: "Admin", description: "Can manage all shared knowledge and system settings." }
];

export async function getSettingsOverview() {
  try {
    const roles = await query<{ key: string; name: string; description: string }>(
      `select key, name, description from roles order by name asc`
    );
    const staleDays = await query<{ value: unknown }>(
      `select value from system_settings where key = 'stale_days_default'`
    );
    const authorityWeights = await query<{ value: unknown }>(
      `select value from system_settings where key = 'authority_weights'`
    );
    const sourceCategories = await query<{ value: unknown }>(
      `select value from system_settings where key = 'source_categories'`
    );
    const teams = await query<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      lead_user_id: string | null;
    }>(`select id, name, slug, description, lead_user_id from teams order by name asc`);
    const users = await query<{
      id: string;
      email: string;
      display_name: string;
      role: string;
      is_active: boolean;
    }>(`select id, email, display_name, role, is_active from users order by created_at asc`);
    return {
      roles: roles.length ? roles : fallbackRoles,
      staleDays: Number(staleDays[0]?.value ?? 30),
      authorityWeights: authorityWeights[0]?.value ?? {},
      sourceCategories: sourceCategories[0]?.value ?? [],
      teams,
      users
    };
  } catch {
    return {
      roles: fallbackRoles,
      staleDays: 30,
      authorityWeights: { gitlab: 5, wiki: 4, pdf: 3, other: 2 },
      sourceCategories: ["Onboarding", "Troubleshooting", "Runbooks", "Architecture"],
      teams: [],
      users: []
    };
  }
}

export async function updateSystemSetting(user: AuthUser, key: string, value: unknown) {
  await query(
    `insert into system_settings (key, value, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
  await query(
    `insert into audit_logs (actor_user_id, action, resource_type, resource_id, payload)
     values ($1, 'update_setting', 'system_settings', $2, $3::jsonb)`,
    [user.id, key, JSON.stringify({ value })]
  );
}
