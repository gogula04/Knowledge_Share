import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { userCanManageTeam } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await context.params;
  if (!(await userCanManageTeam(user, teamId)) && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await query<{
    user_id: string;
    email: string;
    display_name: string;
    is_lead: boolean;
    member_title: string | null;
  }>(
    `select u.id as user_id, u.email, u.display_name, ut.is_lead, ut.member_title
     from user_teams ut
     join users u on u.id = ut.user_id
     where ut.team_id = $1
     order by ut.is_lead desc, u.display_name asc`,
    [teamId]
  );

  return NextResponse.json({ members });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await context.params;
  if (!(await userCanManageTeam(user, teamId)) && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const users = await query<{ id: string }>(`select id from users where lower(email) = lower($1) limit 1`, [email]);
  const member = users[0];
  if (!member) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await query(
    `insert into user_teams (user_id, team_id, is_lead, member_title)
     values ($1, $2, $3, $4)
     on conflict (user_id, team_id) do update
     set is_lead = excluded.is_lead,
         member_title = excluded.member_title`,
    [member.id, teamId, Boolean(body?.isLead), body?.memberTitle ?? null]
  );

  return NextResponse.json({ ok: true });
}

