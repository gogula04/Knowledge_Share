import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listResources } from "@/lib/resources";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const resources = await listResources(user, {
    workspaceType: (url.searchParams.get("workspaceType") as "team" | "common" | "all" | null) ?? "all",
    teamId: url.searchParams.get("teamId") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    tag: url.searchParams.get("tag") ?? undefined,
    sourceType: (url.searchParams.get("sourceType") as any) ?? "all",
    freshness: (url.searchParams.get("freshness") as any) ?? "all",
    search: url.searchParams.get("search") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 30),
    offset: Number(url.searchParams.get("offset") ?? 0)
  });

  return NextResponse.json({ resources });
}

