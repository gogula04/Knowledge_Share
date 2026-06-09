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
  const role = String(body?.role ?? "");
  if (!["normal", "team_lead", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  await query(`update users set role = $2::user_role, updated_at = now() where id = $1`, [id, role]);
  return NextResponse.json({ ok: true });
}

