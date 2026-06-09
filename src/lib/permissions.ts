import { query } from "@/lib/db";
import { type AuthUser } from "@/lib/auth";
import { type WorkspaceScope, type WorkspaceType, type UserRole } from "@/lib/types";
import { seedTeams } from "@/lib/sample-data";

const fallbackTeam = seedTeams[0] ?? {
  name: "Foundation and Framework",
  slug: "foundation-framework",
  description: "Core platform engineering, setup, and framework support."
};

export async function getUserTeams(userId: string) {
  if (userId.startsWith("demo-")) {
    return [
      {
        id: "demo-team-foundation-framework",
        name: fallbackTeam.name,
        slug: fallbackTeam.slug,
        is_lead: userId === "demo-admin" || userId === "demo-lead"
      }
    ];
  }
  try {
    return await query<{
      id: string;
      name: string;
      slug: string;
      is_lead: boolean;
    }>(
      `select t.id, t.name, t.slug, ut.is_lead
       from user_teams ut
       join teams t on t.id = ut.team_id
       where ut.user_id = $1
       order by t.name asc`,
      [userId]
    );
  } catch {
    const isLead = userId === "demo-admin" || userId === "demo-lead" || userId.includes("lead");
    return [
      {
        id: "demo-team-foundation-framework",
        name: fallbackTeam.name,
        slug: fallbackTeam.slug,
        is_lead: isLead
      }
    ];
  }
}

export async function getAccessibleWorkspaceTypes(user: AuthUser) {
  if (user.role === "admin") {
    return ["team", "common"] as WorkspaceType[];
  }
  return ["team", "common"] as WorkspaceType[];
}

export async function userCanManageCommon(user: AuthUser) {
  return user.role === "admin";
}

export async function userCanManageTeam(user: AuthUser, teamId: string) {
  if (user.role === "admin") return true;
  if (user.role === "team_lead") return true;
  try {
    const rows = await query<{ is_lead: boolean }>(
      `select is_lead from user_teams where user_id = $1 and team_id = $2`,
      [user.id, teamId]
    );
    return rows[0]?.is_lead ?? false;
  } catch {
    return true;
  }
}

export function normalizeScope(scope?: string | null): WorkspaceScope {
  if (scope === "team" || scope === "common" || scope === "both") {
    return scope;
  }
  return "both";
}

export function scopeToTypes(scope: WorkspaceScope) {
  if (scope === "team") return ["team"] as WorkspaceType[];
  if (scope === "common") return ["common"] as WorkspaceType[];
  return ["team", "common"] as WorkspaceType[];
}

export function userHasAdminAccess(user: AuthUser) {
  return user.role === "admin";
}

export function userHasTeamLeadAccess(user: AuthUser) {
  return user.role === "team_lead" || user.role === "admin";
}

export async function ensureCanAccessWorkspace(user: AuthUser, workspaceType: WorkspaceType, teamId?: string | null) {
  if (workspaceType === "common") {
    return user.role === "admin";
  }
  if (user.role === "admin" || user.role === "team_lead" || user.role === "normal") return true;
  if (!teamId) return false;
  try {
    const teamRows = await query<{ id: string }>(
      `select team_id as id from user_teams where user_id = $1 and team_id = $2`,
      [user.id, teamId]
    );
    return teamRows.length > 0;
  } catch {
    return true;
  }
}
