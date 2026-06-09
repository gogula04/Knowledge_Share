import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await query<{
    question: string;
    reason: string;
    workspace_scope: string;
    created_at: string;
  }>(
    `select question, reason, workspace_scope, created_at
     from unanswered_questions
     where user_id = $1 or user_id is null
     order by created_at desc
     limit 20`,
    [user.id]
  );

  return NextResponse.json({ unanswered: rows });
}

