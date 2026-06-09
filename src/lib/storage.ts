import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";

export async function ensureStorageDir() {
  await fs.mkdir(env.STORAGE_DIR, { recursive: true });
}

export async function saveBufferToStorage(fileName: string, buffer: Buffer) {
  await ensureStorageDir();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueName = `${Date.now()}-${safeName}`;
  const filePath = path.join(env.STORAGE_DIR, uniqueName);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function deleteStoredFile(filePath: string | null | undefined) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignore missing files.
  }
}

export function toPublicStorageUrl(filePath: string | null | undefined) {
  if (!filePath) return null;
  return `/${filePath.replace(/^\.?\/?/, "")}`;
}

