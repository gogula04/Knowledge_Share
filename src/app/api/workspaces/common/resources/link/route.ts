import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createResourceDocument, isDatabaseUnavailable } from "@/lib/resources";
import { userCanManageCommon } from "@/lib/permissions";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await userCanManageCommon(user))) {
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
      workspaceType: "common",
      sourceType: body.sourceType ?? "Other",
      originalSourceLink: body.url,
      category: body.category ?? null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      accessScope: "common",
      sourceAuthorityLevel: Number(body.authority ?? 5),
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
      [user.id, documentId, JSON.stringify({ title: body.title, url: body.url, workspaceType: "common" })]
    );
  } catch {
    // Audit logging is best-effort and must not block resource creation.
  }

  return NextResponse.json({ ok: true, documentId });
}
