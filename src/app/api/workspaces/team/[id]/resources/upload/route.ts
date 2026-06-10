import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createResourceDocument, isDatabaseUnavailable } from "@/lib/resources";
import { userCanManageTeam } from "@/lib/permissions";
import { deleteStoredFile, saveBufferToStorage } from "@/lib/storage";
import { query } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

function inferSourceType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "PDF";
  if (ext === ".docx") return "Other";
  if (ext === ".pptx") return "PPT";
  if ([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"].includes(ext)) return "Image";
  if (ext === ".md" || ext === ".markdown") return "README";
  return "Other";
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: teamId } = await context.params;
  if (!(await userCanManageTeam(user, teamId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required." }, { status: 400 });
  }

  const title = String(formData.get("title") ?? file.name).trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const bytes = Buffer.from(await file.arrayBuffer());
  const filePath = await saveBufferToStorage(file.name, bytes);

  let documentId: string;
  try {
    documentId = await createResourceDocument({
      title,
      workspaceType: "team",
      teamId,
      sourceType: inferSourceType(file.name),
      fileName: file.name,
      filePath,
      category,
      tags,
      accessScope: "team",
      sourceAuthorityLevel: Number(formData.get("authority") ?? 4),
      uploadedBy: user
    });
  } catch (error) {
    await deleteStoredFile(filePath).catch(() => undefined);
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    }
    throw error;
  }

  try {
    await query(
      `insert into audit_logs (actor_user_id, action, resource_type, resource_id, payload)
       values ($1, 'upload_resource', 'document', $2, $3::jsonb)`,
      [user.id, documentId, JSON.stringify({ title, fileName: file.name, workspaceType: "team", teamId })]
    );
  } catch {
    // Audit logging is best-effort and must not block resource creation.
  }

  return NextResponse.json({ ok: true, documentId });
}
