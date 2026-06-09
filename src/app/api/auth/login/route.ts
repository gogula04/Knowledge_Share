import { NextResponse } from "next/server";
import { getRoleIdentity, issueSessionCookie } from "@/lib/auth";
import { type UserRole } from "@/lib/types";

function resolveRole(value: string): UserRole | null {
  const roleMap: Record<string, UserRole> = {
    admin: "admin",
    "team-lead": "team_lead",
    "team_lead": "team_lead",
    lead: "team_lead",
    "normal": "normal",
    member: "normal",
    engineer: "normal",
    "admin@fms.local": "admin",
    "lead@fms.local": "team_lead",
    "engineer@fms.local": "normal"
  };
  return roleMap[value.toLowerCase()] ?? null;
}

async function createRoleSession(request: Request, roleValue: string, next: string | null) {
  const role = resolveRole(roleValue);
  if (!role) {
    return NextResponse.json({ error: "Select a role to continue." }, { status: 400 });
  }

  const user = await getRoleIdentity(role);
  if (!user) {
    return NextResponse.json({ error: "Unable to create a session for that role." }, { status: 500 });
  }

  await issueSessionCookie(user);

  if (next) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.json({ ok: true, user });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role") ?? url.searchParams.get("access") ?? url.searchParams.get("email") ?? "";
  const next = url.searchParams.get("next");
  return createRoleSession(request, role, next);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const roleValue = String(body?.role ?? body?.access ?? body?.email ?? "").trim();
  const next = body?.next ? String(body.next) : null;
  return createRoleSession(request, roleValue, next);
}
