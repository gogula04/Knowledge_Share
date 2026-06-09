import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceOverview } from "@/lib/resources";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overview = await getWorkspaceOverview(user);
  return NextResponse.json(overview);
}

