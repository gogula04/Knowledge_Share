import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { askKnowledgeQuestion } from "@/lib/chat";
import { normalizeScope } from "@/lib/permissions";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const question = String(body?.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const workspaceScope = normalizeScope(body?.workspaceScope ?? body?.scope);
  const teamId = body?.teamId ? String(body.teamId) : null;
  const sessionId = body?.sessionId ? String(body.sessionId) : null;

  const result = await askKnowledgeQuestion({
    user,
    question,
    workspaceScope,
    teamId,
    sessionId
  });

  return NextResponse.json(result);
}

