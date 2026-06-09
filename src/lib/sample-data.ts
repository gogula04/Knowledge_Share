import { type UserRole } from "@/lib/types";

export const seedUsers = [
  {
    email: "admin@fms.local",
    displayName: "Smith Jeshua",
    role: "admin" as UserRole,
    avatarUrl: null
  },
  {
    email: "lead@fms.local",
    displayName: "Venkatesh",
    role: "team_lead" as UserRole,
    avatarUrl: null
  },
  {
    email: "engineer@fms.local",
    displayName: "Taylor Brooks",
    role: "normal" as UserRole,
    avatarUrl: null
  }
];

export const seedTeams = [
  {
    name: "Foundation and Framework",
    slug: "foundation-framework",
    description: "Core platform engineering, setup, and framework support."
  }
];

export const recentSearches = [
  "What tools do I need to install as a new FMS engineer?",
  "What if Docker does not start?",
  "How do I find the latest verification process?"
];

export const useCaseCards = [
  {
    title: "New engineer onboarding",
    description: "Find install steps, local setup, access links, and first-week checklists without hopping between pages."
  },
  {
    title: "Tool installation help",
    description: "Ask what to install, how to validate it, and which doc is the latest authoritative source."
  },
  {
    title: "Troubleshooting known issues",
    description: "Search for prior fixes, environment notes, and official troubleshooting guidance from both workspaces."
  },
  {
    title: "Process discovery",
    description: "Locate the right workflow guide, then follow the verified steps and source links."
  },
  {
    title: "Latest documentation",
    description: "See what may be stale, compare conflicts, and surface the current source of truth."
  },
  {
    title: "Past demos and PPTs",
    description: "Keep presentations and recorded demos searchable so knowledge does not disappear after the meeting."
  }
];
