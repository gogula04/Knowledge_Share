import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const question = String(body?.question ?? "").trim();
  const note = String(body?.note ?? "").trim();
  const rating = Number(body?.rating ?? 0);
  const sessionId = body?.sessionId ? String(body.sessionId) : null;

  await query(
    `insert into audit_logs (actor_user_id, action, resource_type, resource_id, payload)
     values ($1, 'feedback', 'chat', $2, $3::jsonb)`,
    [user.id, sessionId, JSON.stringify({ question, note, rating })]
  );

  return NextResponse.json({ ok: true });
}

