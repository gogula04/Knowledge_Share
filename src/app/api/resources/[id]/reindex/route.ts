import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reindexResource } from "@/lib/resources";
import { query } from "@/lib/db";
import { userCanManageCommon, userCanManageTeam } from "@/lib/permissions";
import { isDatabaseUnavailable } from "@/lib/resources";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let document: { workspace_type: string; team_id: string | null } | null = null;
  try {
    const rows = await query<{ workspace_type: string; team_id: string | null }>(
      `select workspace_type, team_id from documents where id = $1`,
      [id]
    );
    document = rows[0] ?? null;
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const canManage =
    document.workspace_type === "common"
      ? await userCanManageCommon(user)
      : await userCanManageTeam(user, document.team_id ?? "");

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await reindexResource(id, user);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
