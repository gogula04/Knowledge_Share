import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/fms_knowledge"),
  DATABASE_SSL: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(24).default("dev-secret-change-me-dev-secret-change-me"),
  POOLSIDE_API_BASE: z.string().url().optional(),
  POOLSIDE_API_KEY: z.string().optional(),
  POOLSIDE_MODEL: z.string().default("laguna_m_fp8_fp8kv_re_04_2026"),
  POOLSIDE_AGENT: z.string().default("laguna_v0"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  EMBEDDING_DIMENSION: z.coerce.number().int().positive().default(1536),
  STALE_DAYS_DEFAULT: z.coerce.number().int().positive().default(30),
  STORAGE_DIR: z.string().default("uploads")
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: process.env.DATABASE_SSL,
  APP_URL: process.env.APP_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  POOLSIDE_API_BASE: process.env.POOLSIDE_API_BASE,
  POOLSIDE_API_KEY: process.env.POOLSIDE_API_KEY,
  POOLSIDE_MODEL: process.env.POOLSIDE_MODEL,
  POOLSIDE_AGENT: process.env.POOLSIDE_AGENT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL,
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
  EMBEDDING_DIMENSION: process.env.EMBEDDING_DIMENSION,
  STALE_DAYS_DEFAULT: process.env.STALE_DAYS_DEFAULT,
  STORAGE_DIR: process.env.STORAGE_DIR
});
