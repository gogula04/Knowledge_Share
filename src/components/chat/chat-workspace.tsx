"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Send, Sparkles, ShieldAlert, Link2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SourceCard } from "@/components/source-card";
import { toast } from "sonner";

type SessionItem = {
  id: string;
  title: string;
  workspace_scope: string;
  selected_team_id: string | null;
  created_at: string;
  updated_at: string;
};

type MessageItem = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Array<{
    documentId: string;
    title: string;
    sourceLink: string | null;
    sourceType: string;
    workspaceType: string;
    teamName: string | null;
    snippet: string;
    authority: number;
    freshness: string;
  }>;
  metadata: {
    confidence?: "high" | "medium" | "low";
    staleWarning?: boolean;
    noRelevantInfo?: boolean;
    followUps?: string[];
    conflicts?: string[];
    usedWorkspaces?: string[];
  };
  created_at: string;
};

type TeamItem = {
  id: string;
  name: string;
  slug: string;
  is_lead: boolean;
};

type ChatWorkspaceProps = {
  userName: string;
  sessions: SessionItem[];
  initialMessages: MessageItem[];
  teams: TeamItem[];
  initialSessionId: string | null;
};

const emptyMessage: MessageItem = {
  id: "empty",
  role: "assistant",
  content:
    "Ask a question about a team or common workspace resource. I will answer only from indexed sources and show the source links I used.",
  citations: [],
  metadata: {},
  created_at: new Date().toISOString()
};

export function ChatWorkspace({ userName, sessions, initialMessages, teams, initialSessionId }: ChatWorkspaceProps) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [workspaceScope, setWorkspaceScope] = useState<"team" | "common" | "both">(sessions[0]?.workspace_scope === "team" || sessions[0]?.workspace_scope === "common" ? sessions[0].workspace_scope : "both");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(teams[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages.length ? initialMessages : [emptyMessage]);
  const [onlyHighAuthority, setOnlyHighAuthority] = useState(false);
  const [groupByWorkspace, setGroupByWorkspace] = useState(true);
  const [pending, startTransition] = useTransition();

  const latestAssistant = useMemo(() => [...messages].reverse().find((message) => message.role === "assistant"), [messages]);
  const visibleCitations = useMemo(() => {
    const citations = latestAssistant?.citations ?? [];
    const filtered = onlyHighAuthority ? citations.filter((citation) => citation.authority >= 4) : citations;
    return filtered
      .slice()
      .sort((left, right) => Number(right.workspaceType === "common") - Number(left.workspaceType === "common") || right.authority - left.authority);
  }, [latestAssistant, onlyHighAuthority]);
  const groupedCitations = useMemo(() => {
    const team = visibleCitations.filter((citation) => citation.workspaceType === "team");
    const common = visibleCitations.filter((citation) => citation.workspaceType === "common");
    return { team, common };
  }, [visibleCitations]);

  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!sessionId) return;
      const response = await fetch(`/api/chat/history?sessionId=${sessionId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (!cancelled && Array.isArray(data.messages)) {
        setMessages(data.messages.length ? data.messages : [emptyMessage]);
      }
    }
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;

    const optimisticUserMessage: MessageItem = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      citations: [],
      metadata: {},
      created_at: new Date().toISOString()
    };
    setMessages((current) => [...current, optimisticUserMessage]);
    setDraft("");

    try {
      const response = await fetch("/api/chat/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          workspaceScope,
          teamId: selectedTeamId,
          sessionId
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error ?? "Chat request failed.");
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      const assistantMessage: MessageItem = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer.answer,
        citations: data.answer.citations ?? [],
        metadata: {
          confidence: data.answer.confidence,
          staleWarning: data.answer.staleWarning,
          noRelevantInfo: data.answer.noRelevantInfo,
          followUps: data.answer.followUps ?? [],
          conflicts: data.answer.conflicts ?? [],
          usedWorkspaces: data.answer.usedWorkspaces ?? []
        },
        created_at: new Date().toISOString()
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-9rem)] gap-4 xl:grid-cols-[260px_minmax(0,1fr)_390px]">
      <Card className="flex flex-col border-border/80">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Saved chat sessions for the current user.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
          {sessions.length ? (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setSessionId(session.id)}
                className={cn(
                  "w-full rounded-2xl border p-3 text-left transition",
                  session.id === sessionId ? "border-accent/50 bg-accent/10" : "border-border/80 bg-bg/40 hover:bg-white/5"
                )}
              >
                <p className="truncate text-sm font-medium">{session.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {session.workspace_scope} • {new Date(session.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border/80 bg-bg/20 p-4 text-sm text-muted-foreground">
              No chat history yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-col border-border/80">
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Ask FMS Knowledge Workspace</CardTitle>
                <CardDescription>
                  Workspace-aware chat that answers only from indexed team and common resources.
                </CardDescription>
              </div>
              <Badge tone="default">Hello, {userName}</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/80 bg-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Scope</p>
                <p className="mt-2 text-sm font-medium capitalize">{workspaceScope}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Team</p>
                <p className="mt-2 truncate text-sm font-medium">{teams.find((team) => team.id === selectedTeamId)?.name ?? "None selected"}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Sources</p>
                <p className="mt-2 text-sm font-medium">{latestAssistant?.citations.length ?? 0} cited</p>
              </div>
            </div>

            <div className="rounded-3xl border border-border/80 bg-[linear-gradient(135deg,hsl(var(--panel)),hsl(var(--panel-2)/0.8))] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Answer quality
                </div>
                {latestAssistant?.metadata.confidence ? (
                  <Badge tone={latestAssistant.metadata.confidence === "high" ? "success" : latestAssistant.metadata.confidence === "medium" ? "default" : "warning"}>
                    {latestAssistant.metadata.confidence}
                  </Badge>
                ) : (
                  <Badge tone="muted">waiting</Badge>
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                The assistant will ground every answer in live indexed documents, surface stale or conflicting guidance, and keep source links visible for review.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))]">
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Workspace scope</span>
              <select
                value={workspaceScope}
                onChange={(event) => setWorkspaceScope(event.target.value as "team" | "common" | "both")}
                className="h-10 w-full rounded-xl border border-border bg-panel px-3 text-sm outline-none"
              >
                <option value="both">Both</option>
                <option value="team">Team</option>
                <option value="common">Common</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Team</span>
              <select
                value={selectedTeamId ?? ""}
                onChange={(event) => setSelectedTeamId(event.target.value || null)}
                className="h-10 w-full rounded-xl border border-border bg-panel px-3 text-sm outline-none"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
                {!teams.length ? <option value="">No team access</option> : null}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Session</span>
              <Input value={sessionId ?? "New session"} readOnly />
            </label>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-border/80 bg-bg/40 p-4 scrollbar-thin">
            {messages.map((message) => (
              <div key={message.id} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[min(760px,92%)] rounded-3xl border p-4 shadow-sm", message.role === "user" ? "border-accent/30 bg-accent text-accent-fg" : "border-border/80 bg-panel/90")}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      {message.role === "user" ? "You" : "Assistant"}
                      {message.role === "assistant" ? <Sparkles className="h-3.5 w-3.5 text-accent" /> : null}
                    </div>
                    {message.role === "assistant" && message.metadata.confidence ? (
                      <Badge tone={message.metadata.confidence === "high" ? "success" : message.metadata.confidence === "medium" ? "default" : "warning"}>
                        {message.metadata.confidence}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{message.content}</p>

                  {message.role === "assistant" && message.metadata.staleWarning ? (
                    <div className="mt-3 flex items-center gap-2 rounded-2xl border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
                      <ShieldAlert className="h-4 w-4" />
                      Some sources may be stale. Check citations before acting on the answer.
                    </div>
                  ) : null}

                  {message.role === "assistant" && message.metadata.conflicts?.length ? (
                    <div className="mt-3 rounded-2xl border border-danger/20 bg-danger/10 p-3 text-xs text-danger">
                      {message.metadata.conflicts.join(" ")}
                    </div>
                  ) : null}

                  {message.role === "assistant" && message.metadata.followUps?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.metadata.followUps.map((followUp) => (
                        <button
                          key={followUp}
                          type="button"
                          onClick={() => setDraft(followUp)}
                          className="rounded-full border border-border/80 bg-bg/40 px-3 py-2 text-xs text-muted-foreground transition hover:border-accent/40 hover:text-fg"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about setup, onboarding, troubleshooting, ownership, or latest documentation..."
              className="min-h-[86px] resize-none"
            />
            <div className="flex gap-2 md:flex-col">
              <Button
                className="h-full md:h-12"
                onClick={() => {
                  startTransition(() => void sendQuestion(draft));
                }}
                disabled={pending || !draft.trim()}
              >
                <Send className="h-4 w-4" />
                Ask
              </Button>
              <Button
                variant="secondary"
                className="h-12 md:w-12 md:px-0"
                onClick={() => setMessages(initialMessages.length ? initialMessages : [emptyMessage])}
                title="Reset visible chat"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col border-border/80">
        <CardHeader>
          <CardTitle>Sources and context</CardTitle>
          <CardDescription>Source cards update with the latest assistant reply.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 overflow-y-auto scrollbar-thin">
          {latestAssistant?.citations.length ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={onlyHighAuthority}
                  onClick={() => setOnlyHighAuthority((current) => !current)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-medium transition",
                    onlyHighAuthority ? "border-accent/40 bg-accent/15 text-fg" : "border-border/80 bg-bg/40 text-muted-foreground hover:border-accent/30 hover:text-fg"
                  )}
                >
                  Only high authority
                </button>
                <button
                  type="button"
                  aria-pressed={groupByWorkspace}
                  onClick={() => setGroupByWorkspace((current) => !current)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-medium transition",
                    groupByWorkspace ? "border-accent/40 bg-accent/15 text-fg" : "border-border/80 bg-bg/40 text-muted-foreground hover:border-accent/30 hover:text-fg"
                  )}
                >
                  Group by workspace
                </button>
              </div>

              {groupByWorkspace ? (
                <div className="space-y-4">
                  {groupedCitations.common.length ? (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Common Workspace</p>
                      {groupedCitations.common.map((citation, index) => (
                        <SourceCard
                          key={`${citation.documentId}-${citation.title}`}
                          title={citation.title}
                          sourceType={citation.sourceType}
                          workspaceType={citation.workspaceType as "team" | "common"}
                          teamName={citation.teamName}
                          freshness={citation.freshness}
                          authority={citation.authority}
                          snippet={citation.snippet}
                          sourceLink={citation.sourceLink}
                          rank={index + 1}
                          compact
                        />
                      ))}
                    </div>
                  ) : null}

                  {groupedCitations.team.length ? (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Team Workspace</p>
                      {groupedCitations.team.map((citation, index) => (
                        <SourceCard
                          key={`${citation.documentId}-${citation.title}`}
                          title={citation.title}
                          sourceType={citation.sourceType}
                          workspaceType={citation.workspaceType as "team" | "common"}
                          teamName={citation.teamName}
                          freshness={citation.freshness}
                          authority={citation.authority}
                          snippet={citation.snippet}
                          sourceLink={citation.sourceLink}
                          rank={index + 1}
                          compact
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                visibleCitations.map((citation, index) => (
                  <SourceCard
                    key={`${citation.documentId}-${citation.title}`}
                    title={citation.title}
                    sourceType={citation.sourceType}
                    workspaceType={citation.workspaceType as "team" | "common"}
                    teamName={citation.teamName}
                    freshness={citation.freshness}
                    authority={citation.authority}
                    snippet={citation.snippet}
                    sourceLink={citation.sourceLink}
                    rank={index + 1}
                    compact
                  />
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-3xl border border-dashed border-border/80 bg-bg/20 p-4 text-sm text-muted-foreground">
                Send a question to see source citations here.
              </div>
              <div className="rounded-3xl border border-border/80 bg-[linear-gradient(180deg,hsl(var(--panel)),hsl(var(--panel-2)/0.78))] p-4">
                <p className="text-sm font-medium">What the answer panel will surface</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>• Source titles, workspace, and freshness</li>
                  <li>• Authority badges and link buttons</li>
                  <li>• Conflict and stale warnings when evidence disagrees</li>
                </ul>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border/80 bg-bg/40 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Follow-up support
            </div>
            <p className="mt-3 text-sm text-fg">
              The assistant can continue the thread, compare team versus common sources, and call out stale or conflicting guidance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
