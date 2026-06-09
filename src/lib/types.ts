export type UserRole = "normal" | "team_lead" | "admin";
export type WorkspaceType = "team" | "common";
export type WorkspaceScope = "team" | "common" | "both";
export type SourceType =
  | "GitLab Page"
  | "README"
  | "Wiki"
  | "Jira"
  | "SharePoint"
  | "PDF"
  | "PPT"
  | "Image"
  | "Manual Note"
  | "Other";
export type AccessScope = "team" | "common" | "restricted";

export type ResourceSummary = {
  id: string;
  title: string;
  sourceType: SourceType;
  workspaceType: WorkspaceType;
  teamName: string | null;
  uploadedBy: string;
  createdAt: string;
  lastIndexedAt: string | null;
  originalSourceLink: string | null;
  fileName: string | null;
  category: string | null;
  tags: string[];
  accessScope: AccessScope;
  sourceAuthorityLevel: number;
  freshStatus: "fresh" | "stale" | "unknown";
  excerpt?: string;
};

export type ChatCitation = {
  documentId: string;
  title: string;
  sourceLink: string | null;
  sourceType: SourceType;
  workspaceType: WorkspaceType;
  teamName: string | null;
  snippet: string;
  authority: number;
  freshness: string;
};

export type RetrievedChunk = ChatCitation & {
  chunkId: string;
  semanticScore: number;
  totalScore: number;
  chunkIndex: number;
  text: string;
};

export type ChatAnswer = {
  answer: string;
  citations: ChatCitation[];
  followUps: string[];
  conflicts: string[];
  staleWarning: boolean;
  confidence: "high" | "medium" | "low";
  noRelevantInfo: boolean;
  usedWorkspaces: WorkspaceScope[];
};

