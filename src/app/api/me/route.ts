import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserTeams } from "@/lib/permissions";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const teams = await getUserTeams(user.id);
  return NextResponse.json({
    user,
    teams
  });
}

