import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isDatabaseUnavailable, markResourceDeleted } from "@/lib/resources";
import { query } from "@/lib/db";
import { userCanManageCommon, userCanManageTeam } from "@/lib/permissions";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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

  const body = await request.json().catch(() => null);
  const tags = Array.isArray(body?.tags) ? body.tags : undefined;

  try {
    await query(
      `update documents
       set title = coalesce($2, title),
           category = coalesce($3, category),
           tags = coalesce($4::text[], tags),
           source_authority_level = coalesce($5, source_authority_level),
           updated_at = now()
       where id = $1`,
      [id, body?.title ?? null, body?.category ?? null, tags ? tags : null, body?.authority ?? null]
    );
  } catch (error) {
    if (!isDatabaseUnavailable(error)) {
      throw error;
    }
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  try {
    await query(
      `insert into audit_logs (actor_user_id, action, resource_type, resource_id, payload)
       values ($1, 'update_resource', 'document', $2, $3::jsonb)`,
      [user.id, id, JSON.stringify(body ?? {})]
    );
  } catch {
    // Audit logging is best-effort and must not block resource updates.
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext) {
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
    await markResourceDeleted(id, user);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true });
}
