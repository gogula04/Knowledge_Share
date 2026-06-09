import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  await query(
    `update teams
     set name = coalesce($2, name),
         slug = coalesce($3, slug),
         description = coalesce($4, description),
         lead_user_id = coalesce($5::uuid, lead_user_id),
         updated_at = now()
     where id = $1`,
    [id, body?.name ?? null, body?.slug ?? null, body?.description ?? null, body?.leadUserId ?? null]
  );

  return NextResponse.json({ ok: true });
}

