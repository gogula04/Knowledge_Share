import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createResourceDocument, isDatabaseUnavailable } from "@/lib/resources";
import { userCanManageTeam } from "@/lib/permissions";
import { query } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await context.params;
  const canManage = await userCanManageTeam(user, teamId);
  if (!canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.url) {
    return NextResponse.json({ error: "Title and URL are required." }, { status: 400 });
  }

  let documentId: string;
  try {
    documentId = await createResourceDocument({
      title: body.title,
      workspaceType: "team",
      teamId,
      sourceType: body.sourceType ?? "Other",
      originalSourceLink: body.url,
      category: body.category ?? null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      accessScope: "team",
      sourceAuthorityLevel: Number(body.authority ?? 4),
      uploadedBy: user,
      summary: body.summary ?? null
    });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }
    throw error;
  }

  try {
    await query(
      `insert into audit_logs (actor_user_id, action, resource_type, resource_id, payload)
       values ($1, 'add_resource_link', 'document', $2, $3::jsonb)`,
      [user.id, documentId, JSON.stringify({ title: body.title, url: body.url, workspaceType: "team", teamId })]
    );
  } catch {
    // Audit logging is best-effort and must not block resource creation.
  }

  return NextResponse.json({ ok: true, documentId });
}
