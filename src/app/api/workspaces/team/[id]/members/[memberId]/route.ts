import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { userCanManageTeam } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string; memberId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId, memberId } = await context.params;
  if (!(await userCanManageTeam(user, teamId)) && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await query(`delete from user_teams where user_id = $1 and team_id = $2`, [memberId, teamId]);
  return NextResponse.json({ ok: true });
}

