import Link from "next/link";
import { ArrowRight, BrainCircuit, Clock3, DatabaseZap, Layers3, MessageSquareText, Pin, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData, getWorkspaceOverview } from "@/lib/resources";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceCard } from "@/components/source-card";
import { formatDateTime } from "@/lib/utils";

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "default"
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "muted";
}) {
  const toneClasses = {
    default: "text-accent",
    success: "text-success",
    muted: "text-muted-foreground"
  } as const;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={`rounded-2xl border border-border/80 bg-bg/40 p-3 ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

const dashboardCopy = {
  admin: {
    badge: "Admin Dashboard",
    title: "Platform control center",
    description: "Manage the common workspace, team spaces, users, and system settings from one place.",
    primaryLabel: "Open common workspace",
    primaryHref: "/workspace/common",
    secondaryLabel: "Open settings",
    secondaryHref: "/settings",
    teamBadge: "Admin Tools",
    teamBadgeTone: "success" as const,
    teamTitle: "Curate team workspaces at scale.",
    teamDescription: "Review team resources, membership, and live links across the organization.",
    teamButtonLabel: "Open team workspace",
    teamButtonHref: "/workspace/team",
    commonBadge: "Shared Knowledge",
    commonBadgeTone: "success" as const,
    commonTitle: "Publish the canonical common workspace.",
    commonDescription: "Keep onboarding, troubleshooting, and standards current for every team.",
    commonButtonLabel: "Open common workspace",
    commonButtonHref: "/workspace/common",
    snapshotTitle: "Admin assistant snapshot",
    snapshotDescription: "Governance-first view of cited answers, workspace health, and source quality.",
    searchPrompt: "How do I review shared workspace health?",
    answerText:
      "I can answer from live indexed Team and Common Workspace sources only. Add or pin live docs to see citations, source cards, stale warnings, and conflict hints here.",
    recentTitle: "Operational activity",
    recentDescription: "What the platform team is checking most often right now.",
    knowledgeTitle: "High-trust platform docs",
    knowledgeDescription: "Pinned resources and governance docs."
  },
  team_lead: {
    badge: "Team Lead Dashboard",
    title: "Your team workspace control room",
    description: "Curate team docs, keep sources fresh, and manage access for your team.",
    primaryLabel: "Open team workspace",
    primaryHref: "/workspace/team",
    secondaryLabel: "Open chat",
    secondaryHref: "/chat",
    teamBadge: "Team Workspace",
    teamBadgeTone: "default" as const,
    teamTitle: "Curate your team knowledge.",
    teamDescription: "Team leads can manage resources, members, and indexed links.",
    teamButtonLabel: "Open team workspace",
    teamButtonHref: "/workspace/team",
    commonBadge: "Shared Knowledge",
    commonBadgeTone: "muted" as const,
    commonTitle: "Browse the common workspace.",
    commonDescription: "Use common docs for cross-team onboarding and platform basics.",
    commonButtonLabel: "Browse common knowledge",
    commonButtonHref: "/library",
    snapshotTitle: "Team lead assistant snapshot",
    snapshotDescription: "Answers prioritize team sources, then approved shared docs.",
    searchPrompt: "What setup docs should my team use first?",
    answerText:
      "I can answer from live indexed Team and Common Workspace sources only. Add or pin live docs to see citations, source cards, stale warnings, and conflict hints here.",
    recentTitle: "Recent team searches",
    recentDescription: "The team’s most common questions right now.",
    knowledgeTitle: "Pinned team knowledge",
    knowledgeDescription: "Your highest-trust docs and links."
  },
  normal: {
    badge: "Employee Dashboard",
    title: "Your knowledge assistant home",
    description: "Search approved docs, ask questions, and browse shared knowledge.",
    primaryLabel: "Open chat",
    primaryHref: "/chat",
    secondaryLabel: "Browse library",
    secondaryHref: "/library",
    teamBadge: "Approved Knowledge",
    teamBadgeTone: "muted" as const,
    teamTitle: "Explore your accessible team sources.",
    teamDescription: "Employees can read team knowledge and jump into chat for cited answers.",
    teamButtonLabel: "Open chat",
    teamButtonHref: "/chat",
    commonBadge: "Shared Library",
    commonBadgeTone: "muted" as const,
    commonTitle: "Browse the common knowledge library.",
    commonDescription: "Read approved cross-team docs, guides, and troubleshooting notes.",
    commonButtonLabel: "Browse library",
    commonButtonHref: "/library",
    snapshotTitle: "Employee assistant snapshot",
    snapshotDescription: "Search-first view of cited answers and approved docs.",
    searchPrompt: "What do I need to know for day one?",
    answerText:
      "I can answer from live indexed Team and Common Workspace sources only. Add or pin live docs to see citations, source cards, stale warnings, and conflict hints here.",
    recentTitle: "Recent searches",
    recentDescription: "What people are asking most often right now.",
    knowledgeTitle: "Frequently used knowledge",
    knowledgeDescription: "Approved docs and high-trust resources."
  }
} as const;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const copy = dashboardCopy[user.role];
  const dashboard = await getDashboardData(user);
  const workspace = await getWorkspaceOverview(user);
  const primaryTeam = dashboard.teams[0] ?? null;
  const commonWorkspace = workspace.commonWorkspace;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/80 bg-[linear-gradient(180deg,hsl(var(--panel)),hsl(var(--panel-2)/0.9))] p-6 shadow-glow">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge tone="default">{copy.badge}</Badge>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg">{copy.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{copy.description}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={copy.primaryHref}>
                {copy.primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={copy.secondaryHref}>{copy.secondaryLabel}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Indexed resources" value={dashboard.totalResources} icon={DatabaseZap} />
            <MetricCard label="Stale sources" value={dashboard.staleResources} icon={Clock3} tone="success" />
            <MetricCard label="Accessible teams" value={dashboard.teamWorkspaceCount} icon={Layers3} tone="muted" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden border-border/80 bg-[linear-gradient(180deg,hsl(var(--panel)),hsl(var(--panel-2)/0.8))]">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge tone={copy.teamBadgeTone}>{copy.teamBadge}</Badge>
                  {primaryTeam?.team_name ? <Badge tone="muted">{primaryTeam.team_name}</Badge> : null}
                </div>
                <CardTitle className="text-2xl">{copy.teamTitle}</CardTitle>
                <CardDescription className="max-w-xl">{copy.teamDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border/80 bg-bg/40 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Resources</p>
                    <p className="mt-2 text-2xl font-semibold">{dashboard.teams.reduce((sum, team) => sum + (team.resource_count ?? 0), 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg/40 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Members</p>
                    <p className="mt-2 text-2xl font-semibold">{dashboard.teams.reduce((sum, team) => sum + (team.member_count ?? 0), 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/80 bg-bg/40 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Lead access</p>
                    <p className="mt-2 text-2xl font-semibold">{dashboard.teams.some((team) => team.is_lead) ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {dashboard.teams.map((team) => (
                    <Badge key={team.team_id} tone="muted">
                      {team.team_name ?? "Team workspace"}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-bg/40 p-4">
                  <div>
                    <p className="text-sm font-medium">Manage resources, members, and indexed links.</p>
                    <p className="text-sm text-muted-foreground">Add docs, re-index stale items, and control team access.</p>
                  </div>
                  <Button asChild>
                    <Link href={copy.teamButtonHref}>
                      {copy.teamButtonLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-border/80">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge tone={copy.commonBadgeTone}>{copy.commonBadge}</Badge>
                  <Badge tone="muted">{user.role === "admin" ? "Admin curated" : "Approved access"}</Badge>
                </div>
                <CardTitle className="text-2xl">{copy.commonTitle}</CardTitle>
                <CardDescription>{copy.commonDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/80 bg-bg/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Current common resources</span>
                    <span className="text-sm font-semibold">{commonWorkspace?.resource_count ?? 0}</span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {dashboard.pinnedResources.slice(0, 3).map((resource) => (
                      <SourceCard
                        key={resource.id}
                        title={resource.title}
                        sourceType={resource.source_type}
                        workspaceType={resource.workspace_type as "team" | "common"}
                        teamName={resource.team_name}
                        freshness={(resource.fresh_status as "fresh" | "stale" | "unknown") ?? "unknown"}
                        authority={resource.source_authority_level}
                        snippet={resource.summary ?? resource.original_source_link ?? "Indexed live source"}
                        sourceLink={resource.original_source_link}
                        createdAt={resource.last_indexed_at}
                        compact
                      />
                    ))}
                  </div>
                </div>
                <Button asChild variant="secondary" className="w-full">
                  <Link href={copy.commonButtonHref}>
                    {copy.commonButtonLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{copy.snapshotTitle}</CardTitle>
              <Badge tone="default">ChatGPT-style</Badge>
            </div>
            <CardDescription>{copy.snapshotDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action="/chat" method="GET" className="rounded-2xl border border-border/80 bg-bg/55 p-4">
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                  Search live knowledge
                </span>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    name="q"
                    defaultValue=""
                    placeholder={copy.searchPrompt}
                    aria-label="Search live knowledge"
                    className="h-11"
                  />
                  <Button type="submit" className="shrink-0">
                    Search
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press Enter or click Search to open chat with this question prefilled.
                </p>
              </label>
            </form>
            <div className="space-y-3 rounded-2xl border border-border/80 bg-panel/90 p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                <BrainCircuit className="h-3.5 w-3.5 text-accent" />
                Answer
              </div>
              <p className="text-sm leading-6 text-fg">{copy.answerText}</p>
              {dashboard.pinnedResources.length ? (
                <div className="grid gap-2">
                  {dashboard.pinnedResources.slice(0, 2).map((resource) => (
                    <SourceCard
                      key={resource.id}
                      title={resource.title}
                      sourceType={resource.source_type}
                      workspaceType={resource.workspace_type as "team" | "common"}
                      teamName={resource.team_name}
                      freshness={(resource.fresh_status as "fresh" | "stale" | "unknown") ?? "unknown"}
                      authority={resource.source_authority_level}
                      snippet={resource.summary ?? resource.original_source_link ?? "Indexed live source"}
                      sourceLink={resource.original_source_link}
                      createdAt={resource.last_indexed_at}
                      compact
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-bg/40 p-4 text-xs text-muted-foreground">
                  No live indexed documents yet. Upload a doc or link to populate this snapshot with source-backed answers.
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button variant="secondary" className="w-full" asChild>
                <Link href="/chat">
                  <MessageSquareText className="h-4 w-4" />
                  Go to chat
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/library">
                  <Pin className="h-4 w-4" />
                  Browse library
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/80">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>{copy.recentTitle}</CardTitle>
              <CardDescription>{copy.recentDescription}</CardDescription>
            </div>
            <Badge tone="muted">{dashboard.recentSearches.length} entries</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.recentSearches.length ? (
              dashboard.recentSearches.map((item, index) => (
                <Link
                  key={item.question}
                  href={`/chat?q=${encodeURIComponent(item.question)}`}
                  className="flex items-center justify-between rounded-2xl border border-border/80 bg-bg/40 p-4 transition hover:border-accent/30 hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.question}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-bg/20 p-5 text-sm text-muted-foreground">
                No recent searches yet. Ask a question in chat to populate this section.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>{copy.knowledgeTitle}</CardTitle>
            <CardDescription>{copy.knowledgeDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.pinnedResources.map((resource) => (
              <SourceCard
                key={resource.id}
                title={resource.title}
                sourceType={resource.source_type}
                workspaceType={resource.workspace_type as "team" | "common"}
                teamName={resource.team_name}
                freshness={(resource.fresh_status as "fresh" | "stale" | "unknown") ?? "unknown"}
                authority={resource.source_authority_level}
                snippet={resource.summary ?? resource.original_source_link ?? "Indexed live source"}
                sourceLink={resource.original_source_link}
                createdAt={resource.last_indexed_at}
              />
            ))}
            {!dashboard.pinnedResources.length ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-bg/20 p-5 text-sm text-muted-foreground">
                Add and pin live indexed documents to surface rich source cards here.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
