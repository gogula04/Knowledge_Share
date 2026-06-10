import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { env } from "@/lib/env";
import { type UserRole } from "@/lib/types";

const encoder = new TextEncoder();
const sessionName = "fms_session";
const roleEmails: Record<UserRole, string> = {
  admin: "admin@fms.local",
  team_lead: "lead@fms.local",
  normal: "engineer@fms.local"
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl: string | null;
};

export async function createSessionToken(user: AuthUser) {
  return new SignJWT({
    email: user.email,
    displayName: user.displayName,
    role: user.role
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encoder.encode(env.JWT_SECRET));
}

export async function readSessionToken(token: string) {
  const { payload } = await jwtVerify(token, encoder.encode(env.JWT_SECRET));
  return {
    id: String(payload.sub ?? ""),
    email: String(payload.email ?? ""),
    displayName: String(payload.displayName ?? ""),
    role: String(payload.role ?? "normal") as UserRole
  };
}

export async function getRoleIdentity(role: UserRole) {
  try {
    const rows = await query<{
      id: string;
      email: string;
      display_name: string;
      role: UserRole;
      avatar_url: string | null;
    }>(
      `select id, email, display_name, role, avatar_url
       from users
       where lower(email) = lower($1) and is_active = true
       limit 1`,
      [roleEmails[role]]
    );

    const user = rows[0];
    if (user) {
      return {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        avatarUrl: user.avatar_url
      } satisfies AuthUser;
    }
  } catch {
  }

  return {
    id: `role-${role}`,
    email: roleEmails[role],
    displayName: role === "admin" ? "Admin" : role === "team_lead" ? "Team Lead" : "Team Member",
    role,
    avatarUrl: null
  };
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionName)?.value;
  if (!token) return null;

  try {
    const session = await readSessionToken(token);
    if (session.id.startsWith("role-")) {
      return {
        id: session.id,
        email: session.email,
        displayName: session.displayName,
        role: session.role,
        avatarUrl: null
      };
    }
    try {
      const rows = await query<{
        id: string;
        email: string;
        display_name: string;
        role: UserRole;
        avatar_url: string | null;
      }>(
        `select id, email, display_name, role, avatar_url
         from users
         where id = $1 and is_active = true`,
        [session.id]
      );

      const user = rows[0];
      if (user) {
        return {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          role: user.role,
          avatarUrl: user.avatar_url
        } satisfies AuthUser;
      }
    } catch {
      // Fall through to the signed session identity below.
    }

    return {
      id: session.id || `role-${session.role}`,
      email: session.email || roleEmails[session.role],
      displayName: session.displayName || (session.role === "admin" ? "Admin" : session.role === "team_lead" ? "Team Lead" : "Team Member"),
      role: session.role,
      avatarUrl: null
    };
  } catch {
    return null;
  }
}

export async function issueSessionCookie(user: AuthUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(sessionName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionName);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function isAtLeastRole(userRole: UserRole, required: UserRole) {
  const hierarchy: UserRole[] = ["normal", "team_lead", "admin"];
  return hierarchy.indexOf(userRole) >= hierarchy.indexOf(required);
}
