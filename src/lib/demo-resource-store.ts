import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { type AuthUser } from "@/lib/auth";
import { type AccessScope, type ResourceSummary, type SourceType, type WorkspaceType } from "@/lib/types";
import { seedTeams } from "@/lib/sample-data";

const demoResourcesFile = path.join(env.STORAGE_DIR, "demo-resources.json");
const fallbackTeamName = seedTeams[0]?.name ?? "Foundation and Framework";

type DemoResourceRecord = ResourceSummary & {
  teamId: string | null;
  filePath: string | null;
  uploadedById: string | null;
  uploadedByName: string | null;
  uploadedBy: string;
  sourceType: SourceType;
  workspaceType: WorkspaceType;
  createdAt: string;
  updatedAt: string;
  lastIndexedAt: string | null;
  summary: string | null;
};

type DemoResourceFilter = {
  workspaceType?: WorkspaceType | "all";
  teamId?: string | "all";
  category?: string | "all";
  tag?: string | "all";
  sourceType?: SourceType | "all";
  freshness?: "fresh" | "stale" | "all";
  search?: string;
};

async function ensureStoreDir() {
  await fs.mkdir(env.STORAGE_DIR, { recursive: true });
}

async function readStore() {
  try {
    const raw = await fs.readFile(demoResourcesFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DemoResourceRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeStore(resources: DemoResourceRecord[]) {
  await ensureStoreDir();
  await fs.writeFile(demoResourcesFile, JSON.stringify(resources, null, 2));
}

function normalize(text: string) {
  return text.toLowerCase();
}

function matchesFilter(resource: DemoResourceRecord, filter: DemoResourceFilter, accessibleTeamIds: string[]) {
  if (filter.workspaceType && filter.workspaceType !== "all" && resource.workspaceType !== filter.workspaceType) {
    return false;
  }
  if (filter.teamId && filter.teamId !== "all" && resource.teamId !== filter.teamId) {
    return false;
  }
  if (filter.category && filter.category !== "all" && (resource.category ?? "") !== filter.category) {
    return false;
  }
  if (filter.tag && filter.tag !== "all" && !(resource.tags ?? []).includes(filter.tag)) {
    return false;
  }
  if (filter.sourceType && filter.sourceType !== "all" && resource.sourceType !== filter.sourceType) {
    return false;
  }
  if (filter.freshness === "fresh" && resource.freshStatus !== "fresh") {
    return false;
  }
  if (filter.freshness === "stale" && resource.freshStatus !== "stale") {
    return false;
  }
  if (filter.search) {
    const haystack = [
      resource.title,
      resource.summary ?? "",
      resource.originalSourceLink ?? "",
      resource.category ?? "",
      resource.fileName ?? "",
      ...(resource.tags ?? [])
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(normalize(filter.search))) {
      return false;
    }
  }
  if (resource.workspaceType === "team" && accessibleTeamIds.length && resource.teamId && !accessibleTeamIds.includes(resource.teamId)) {
    return false;
  }
  return true;
}

export async function listDemoResourcesForUser(
  user: AuthUser,
  filter: DemoResourceFilter = {},
  accessibleTeamIds: string[] = []
) {
  const resources = await readStore();
  return resources
    .filter((resource) => matchesFilter(resource, filter, accessibleTeamIds))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((resource) => ({
      id: resource.id,
      title: resource.title,
      sourceType: resource.sourceType,
      workspaceType: resource.workspaceType,
      teamName: resource.teamName,
      uploadedBy: resource.uploadedByName ?? "System",
      createdAt: resource.createdAt,
      lastIndexedAt: resource.lastIndexedAt,
      originalSourceLink: resource.originalSourceLink,
      fileName: resource.fileName,
      category: resource.category,
      tags: resource.tags ?? [],
      accessScope: resource.accessScope,
      sourceAuthorityLevel: resource.sourceAuthorityLevel,
      freshStatus: resource.freshStatus,
      excerpt: resource.excerpt ?? resource.summary ?? resource.originalSourceLink ?? "Demo resource"
    })) satisfies ResourceSummary[];
}

export async function createDemoResource(input: {
  title: string;
  workspaceType: WorkspaceType;
  teamId?: string | null;
  sourceType: SourceType;
  originalSourceLink?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  category?: string | null;
  tags?: string[];
  accessScope?: AccessScope;
  sourceAuthorityLevel?: number;
  uploadedBy?: AuthUser | null;
  uploadedByName?: string | null;
  summary?: string | null;
}) {
  const now = new Date().toISOString();
  const resource: DemoResourceRecord = {
    id: `demo-resource-${crypto.randomUUID()}`,
    title: input.title,
    sourceType: input.sourceType,
    workspaceType: input.workspaceType,
    teamId: input.teamId ?? null,
    teamName: input.workspaceType === "common" ? null : fallbackTeamName,
    uploadedById: input.uploadedBy?.id ?? null,
    uploadedByName: input.uploadedByName ?? input.uploadedBy?.displayName ?? null,
    uploadedBy: input.uploadedByName ?? input.uploadedBy?.displayName ?? "System",
    createdAt: now,
    updatedAt: now,
    lastIndexedAt: now,
    originalSourceLink: input.originalSourceLink ?? null,
    fileName: input.fileName ?? null,
    filePath: input.filePath ?? null,
    category: input.category ?? null,
    tags: input.tags ?? [],
    accessScope: input.accessScope ?? (input.workspaceType === "common" ? "common" : "team"),
    sourceAuthorityLevel: input.sourceAuthorityLevel ?? (input.workspaceType === "common" ? 5 : 4),
    freshStatus: "fresh",
    summary: input.summary ?? (input.originalSourceLink ? `Added link: ${input.originalSourceLink}` : "Uploaded in demo mode."),
    excerpt: input.summary ?? (input.originalSourceLink ?? input.fileName ?? "Demo resource")
  };

  const resources = await readStore();
  resources.push(resource);
  await writeStore(resources);
  return resource.id;
}

export async function getDemoResourceById(resourceId: string) {
  const resources = await readStore();
  return resources.find((resource) => resource.id === resourceId) ?? null;
}

export async function updateDemoResource(
  resourceId: string,
  updates: Partial<Pick<DemoResourceRecord, "title" | "category" | "tags" | "sourceAuthorityLevel">>
) {
  const resources = await readStore();
  const index = resources.findIndex((resource) => resource.id === resourceId);
  if (index < 0) return false;

  resources[index] = {
    ...resources[index],
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.category !== undefined ? { category: updates.category } : {}),
    ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
    ...(updates.sourceAuthorityLevel !== undefined ? { sourceAuthorityLevel: updates.sourceAuthorityLevel } : {}),
    updatedAt: new Date().toISOString()
  };
  await writeStore(resources);
  return true;
}

export async function deleteDemoResource(resourceId: string) {
  const resources = await readStore();
  const next = resources.filter((resource) => resource.id !== resourceId);
  if (next.length === resources.length) return false;
  await writeStore(next);
  return true;
}

export async function reindexDemoResource(resourceId: string) {
  const resources = await readStore();
  const index = resources.findIndex((resource) => resource.id === resourceId);
  if (index < 0) return false;
  resources[index] = {
    ...resources[index],
    lastIndexedAt: new Date().toISOString(),
    freshStatus: "fresh",
    updatedAt: new Date().toISOString()
  };
  await writeStore(resources);
  return true;
}
