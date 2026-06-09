import { getCurrentUser } from "@/lib/auth";
import { getAnalyticsOverview } from "@/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function Sparkline({ values }: { values: number[] }) {
  const width = 160;
  const height = 48;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / Math.max(max - min, 1)) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-12 w-40 overflow-visible">
      <polyline fill="none" stroke="currentColor" strokeWidth="2.5" points={points} className="text-accent" />
    </svg>
  );
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const analytics = await getAnalyticsOverview(user);
  const topSearchCounts = analytics.mostSearchedTopics.map((item) => item.count);

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>See what people search for, what they cannot find, and which sources may need attention.</CardDescription>
            </div>
            <Badge tone="muted">{analytics.staleDocs.length} stale docs found</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-4">
          <Card className="border-border/80 bg-bg/40 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Most searched topics</p>
            <div className="mt-4">
              <Sparkline values={topSearchCounts.length ? topSearchCounts : [1, 2, 3, 2, 4, 5]} />
            </div>
          </Card>
          <Card className="border-border/80 bg-bg/40 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Unanswered questions</p>
            <p className="mt-3 text-3xl font-semibold">{analytics.unansweredQuestions.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">Questions flagged because the indexed evidence was not enough.</p>
          </Card>
          <Card className="border-border/80 bg-bg/40 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Stale sources</p>
            <p className="mt-3 text-3xl font-semibold">{analytics.staleDocs.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">Sources older than the default freshness threshold.</p>
          </Card>
          <Card className="border-border/80 bg-bg/40 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Documentation gaps</p>
            <p className="mt-3 text-3xl font-semibold">{analytics.documentationGaps.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">Repeated unanswered patterns that may need new resources.</p>
          </Card>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Most searched topics</CardTitle>
            <CardDescription>What users ask the assistant most often.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.mostSearchedTopics.length ? (
              analytics.mostSearchedTopics.map((search) => (
                <div key={search.question} className="flex items-center justify-between rounded-2xl border border-border/80 bg-bg/40 p-4">
                  <p className="text-sm font-medium">{search.question}</p>
                  <Badge tone="default">{search.count}</Badge>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-bg/20 p-5 text-sm text-muted-foreground">
                Search analytics will appear here after people start using the assistant.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Questions with no answer</CardTitle>
            <CardDescription>Signals for missing or stale knowledge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.unansweredQuestions.length ? (
              analytics.unansweredQuestions.map((item) => (
                <div key={`${item.question}-${item.created_at}`} className="rounded-2xl border border-border/80 bg-bg/40 p-4">
                  <p className="text-sm font-medium">{item.question}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-bg/20 p-5 text-sm text-muted-foreground">
                No unanswered questions have been recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Stale docs</CardTitle>
            <CardDescription>Documents that should probably be re-indexed or refreshed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.staleDocs.length ? (
              analytics.staleDocs.map((doc) => (
                <div key={doc.id} className="rounded-2xl border border-border/80 bg-bg/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.workspace_type} {doc.team_name ? `• ${doc.team_name}` : ""}
                      </p>
                    </div>
                    <Badge tone="warning">Stale</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-bg/20 p-5 text-sm text-muted-foreground">
                No stale docs are currently flagged.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Documentation gaps</CardTitle>
            <CardDescription>Repeated unanswered topics that merit new articles or notes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.documentationGaps.length ? (
              analytics.documentationGaps.map((gap) => (
                <div key={gap.question} className="flex items-center justify-between rounded-2xl border border-border/80 bg-bg/40 p-4">
                  <p className="text-sm font-medium">{gap.question}</p>
                  <Badge tone="muted">{gap.count}</Badge>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-bg/20 p-5 text-sm text-muted-foreground">
                No documentation gaps have been identified yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

