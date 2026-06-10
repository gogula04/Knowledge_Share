import Link from "next/link";
import { AlertTriangle, BookOpenText, MessageSquareText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

type SearchUseCase = {
  question: string;
  count: number;
  workspace_scope: "team" | "common" | "both";
  last_asked_at: string | null;
};

type GapUseCase = {
  question: string;
  reason: string;
  workspace_scope: "team" | "common" | "both";
  count: number;
  last_seen_at: string | null;
};

function scopeTone(scope: SearchUseCase["workspace_scope"]) {
  if (scope === "team") return "default" as const;
  if (scope === "common") return "success" as const;
  return "muted" as const;
}

function scopeLabel(scope: SearchUseCase["workspace_scope"]) {
  if (scope === "team") return "Team workspace";
  if (scope === "common") return "Common workspace";
  return "Team + common";
}

export default async function UseCasesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [liveUseCases, unansweredSignals] = await Promise.all([
    query<SearchUseCase>(
      `select
         question,
         count(*)::int as count,
         case
           when bool_or(workspace_scope = 'both') then 'both'
           when bool_or(workspace_scope = 'team') and bool_or(workspace_scope = 'common') then 'both'
           when bool_or(workspace_scope = 'team') then 'team'
           else 'common'
         end as workspace_scope,
         max(created_at) as last_asked_at
       from search_analytics
       where user_id = $1
       group by question
       order by count(*) desc, max(created_at) desc
       limit 6`,
      [user.id]
    ),
    query<GapUseCase>(
      `select
         question,
         reason,
         workspace_scope,
         count(*)::int as count,
         max(created_at) as last_seen_at
       from unanswered_questions
       where user_id = $1 or user_id is null
       group by question, reason, workspace_scope
       order by count(*) desc, max(created_at) desc
       limit 6`,
      [user.id]
    )
  ]);

  const observedCount = liveUseCases.reduce((sum, item) => sum + item.count, 0);
  const unansweredCount = unansweredSignals.reduce((sum, item) => sum + item.count, 0);
  const latestUseCase = liveUseCases[0] ?? null;

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-[linear-gradient(180deg,hsl(var(--panel)),hsl(var(--panel-2)/0.88))]">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge tone="default">Live use cases</Badge>
              <CardTitle className="mt-3 text-2xl">What people are actually asking the assistant</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">
                These scenarios are pulled from your live search analytics and unanswered question logs. Nothing here is hardcoded.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="secondary">
                <Link href="/chat">
                  <MessageSquareText className="h-4 w-4" />
                  Ask in chat
                </Link>
              </Button>
              <Button asChild>
                <Link href="/analytics">
                  <Sparkles className="h-4 w-4" />
                  Review analytics
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/80 bg-bg/40">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Observed searches</p>
                <p className="mt-2 text-3xl font-semibold">{observedCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">Live questions asked by this account.</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-bg/40">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Unanswered signals</p>
                <p className="mt-2 text-3xl font-semibold">{unansweredCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">Questions that need a better indexed source.</p>
              </CardContent>
            </Card>
            <Card className="border-border/80 bg-bg/40">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Latest live question</p>
                <p className="mt-2 text-lg font-semibold leading-6">{latestUseCase?.question ?? "No searches yet"}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {latestUseCase?.last_asked_at ? formatDateTime(latestUseCase.last_asked_at) : "Ask a question to populate this view."}
                </p>
              </CardContent>
            </Card>
          </div>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-fg">Observed live use cases</h2>
            <p className="text-sm text-muted-foreground">The most common questions from your live analytics.</p>
          </div>
          <Badge tone="muted">{liveUseCases.length} scenarios</Badge>
        </div>

        {liveUseCases.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveUseCases.map((item) => (
              <Card key={item.question} className="border-border/80 bg-bg/40">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={scopeTone(item.workspace_scope)}>{scopeLabel(item.workspace_scope)}</Badge>
                    <Badge tone="muted">{item.count} asked</Badge>
                  </div>
                  <CardTitle className="text-lg leading-7">{item.question}</CardTitle>
                  <CardDescription className="space-y-1">
                    <div>Asked from live search history only.</div>
                    <div>{item.last_asked_at ? `Last asked ${formatDateTime(item.last_asked_at)}` : "No timestamp available."}</div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Open it in chat</p>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/chat">
                      <MessageSquareText className="h-4 w-4" />
                      Ask in chat
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/80 bg-bg/40">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <Badge tone="muted">No live searches yet</Badge>
              <p className="text-sm text-muted-foreground">
                Ask a few questions in chat and this section will populate automatically from the database.
              </p>
              <Button asChild variant="secondary">
                <Link href="/chat">
                  <MessageSquareText className="h-4 w-4" />
                  Go to chat
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-fg">Documentation gaps</h2>
            <p className="text-sm text-muted-foreground">Queries that came back without enough indexed evidence.</p>
          </div>
          <Badge tone="warning">{unansweredSignals.length} signals</Badge>
        </div>

        {unansweredSignals.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {unansweredSignals.map((item) => (
              <Card key={`${item.question}-${item.workspace_scope}-${item.reason}`} className="border-border/80 bg-bg/40">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="warning">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Gap
                    </Badge>
                    <Badge tone={item.workspace_scope === "team" ? "default" : item.workspace_scope === "common" ? "success" : "muted"}>
                      {scopeLabel(item.workspace_scope)}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-7">{item.question}</CardTitle>
                  <CardDescription>{item.reason}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                    {item.count} signal{item.count === 1 ? "" : "s"} • {item.last_seen_at ? formatDateTime(item.last_seen_at) : "recent"}
                  </p>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/analytics">
                      <BookOpenText className="h-4 w-4" />
                      Review analytics
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/80 bg-bg/40">
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <Badge tone="success">
                <AlertTriangle className="h-3.5 w-3.5" />
                No gaps recorded
              </Badge>
              <p className="text-sm text-muted-foreground">
                No unanswered questions have been logged yet. When the assistant cannot find enough evidence, they will appear here automatically.
              </p>
              <Button asChild variant="secondary">
                <Link href="/analytics">
                  <BookOpenText className="h-4 w-4" />
                  Open analytics
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
