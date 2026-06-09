import pg from "pg";
import { env } from "@/lib/env";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __fmsPool: pg.Pool | undefined;
}

export const pool =
  globalThis.__fmsPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    ssl: shouldUseSsl(env.DATABASE_URL, env.DATABASE_SSL) ? { rejectUnauthorized: false } : undefined
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__fmsPool = pool;
}

export async function query<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

function shouldUseSsl(connectionString: string, explicitFlag?: string) {
  if (explicitFlag) {
    return explicitFlag.toLowerCase() === "true";
  }

  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase();
    return host.includes("supabase.co") || host.includes("pooler.supabase.com") || url.searchParams.get("sslmode") === "require";
  } catch {
    return false;
  }
}

export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function vectorLiteral(values: number[]) {
  return `[${values.map((value) => Number.isFinite(value) ? value.toFixed(6) : "0").join(",")}]`;
}
