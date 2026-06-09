import { processQueuedIngestionJobs } from "@/lib/ingest";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

async function ensureWorkerUser() {
  const rows = await query<{
    id: string;
    email: string;
    display_name: string;
    role: "admin" | "team_lead" | "normal";
    avatar_url: string | null;
  }>(
    `select id, email, display_name, role, avatar_url
     from users
     where role = 'admin'
     order by created_at asc
     limit 1`
  );

  const user = rows[0];
  if (!user) {
    return getCurrentUser();
  }
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    role: user.role,
    avatarUrl: user.avatar_url
  };
}

async function main() {
  console.log("[worker] FMS Knowledge Workspace worker started");
  const workerUser = await ensureWorkerUser();

  while (true) {
    try {
      const results = await processQueuedIngestionJobs(5, { workerUser });
      if (results.every((result) => result === null)) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.error("[worker] ingestion loop error", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

