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
    count: number;
    created_at: string;
  }>(
    `select question, count(*)::int as count, max(created_at) as created_at
     from search_analytics
     where user_id = $1
     group by question
     order by count(*) desc, question asc
     limit 20`,
    [user.id]
  );

  return NextResponse.json({ searches: rows });
}

