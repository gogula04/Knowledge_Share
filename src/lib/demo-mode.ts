import { seedUsers } from "@/lib/sample-data";
import { type AuthUser } from "@/lib/auth";

export const demoUsers: AuthUser[] = seedUsers.map((user) => ({
  id:
    user.email === "admin@fms.local"
      ? "demo-admin"
      : user.email === "lead@fms.local"
        ? "demo-lead"
        : "demo-engineer",
  email: user.email,
  displayName: user.displayName,
  role: user.role,
  avatarUrl: user.avatarUrl
}));
