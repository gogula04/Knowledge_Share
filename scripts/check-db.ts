import { query } from "@/lib/db";

async function main() {
  const rows = await query<{ now: string }>("select now() as now");
  console.log(`[db] connected at ${rows[0]?.now ?? "unknown"}`);
}

main().catch((error) => {
  console.error("[db] connection failed", error);
  process.exit(1);
});

