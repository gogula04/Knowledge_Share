import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getChatOverview, getChatMessages } from "@/lib/chat";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (sessionId) {
    const messages = await getChatMessages(sessionId, user);
    return NextResponse.json({ sessionId, messages });
  }

  const overview = await getChatOverview(user);
  return NextResponse.json(overview);
}

