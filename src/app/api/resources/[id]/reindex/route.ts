import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { reindexResource } from "@/lib/resources";
import { query } from "@/lib/db";
import { userCanManageCommon, userCanManageTeam } from "@/lib/permissions";
import { getDemoResourceById } from "@/lib/demo-resource-store";

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
  } catch {
    // Fall back to the demo store below.
  }

  if (!document) {
    const demoDocument = await getDemoResourceById(id);
    if (!demoDocument) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    document = {
      workspace_type: demoDocument.workspaceType,
      team_id: demoDocument.teamId ?? null
    };
  }

  const canManage =
    document.workspace_type === "common"
      ? await userCanManageCommon(user)
      : await userCanManageTeam(user, document.team_id ?? "");

  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await reindexResource(id, user);
  return NextResponse.json({ ok: true });
}
