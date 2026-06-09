import { ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";

type SourceCardProps = {
  title: string;
  sourceType: string;
  workspaceType: "team" | "common";
  teamName: string | null;
  freshness: "fresh" | "stale" | "unknown" | string;
  authority: number;
  snippet: string;
  sourceLink: string | null;
  createdAt?: string | null;
  tags?: string[];
  rank?: number;
  compact?: boolean;
  className?: string;
};

export function SourceCard({
  title,
  sourceType,
  workspaceType,
  teamName,
  freshness,
  authority,
  snippet,
  sourceLink,
  createdAt,
  tags = [],
  rank,
  compact = false,
  className
}: SourceCardProps) {
  return (
    <article
      className={cn(
        "group rounded-3xl border border-border/80 bg-[linear-gradient(180deg,hsl(var(--panel)),hsl(var(--panel-2)/0.78))] p-4 shadow-sm transition hover:border-accent/35 hover:shadow-md",
        compact && "p-3",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {typeof rank === "number" ? (
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border/80 bg-bg/60 text-[11px] font-semibold text-muted-foreground">
                {rank}
              </span>
            ) : (
              <FileText className="h-4 w-4 shrink-0 text-accent" />
            )}
            <p className="truncate text-sm font-medium">{title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {sourceType} {workspaceType === "team" ? `• ${teamName ?? "Team Workspace"}` : "• Common Workspace"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge tone={freshness === "fresh" ? "success" : freshness === "stale" ? "warning" : "muted"}>{freshness}</Badge>
          <Badge tone="muted">A{authority}</Badge>
        </div>
      </div>

      <p className={cn("mt-3 text-sm leading-6 text-fg/90", compact && "text-xs leading-5 text-muted-foreground")}>{snippet}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {tags.slice(0, 3).map((tag) => (
          <Badge key={tag} tone="muted">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {createdAt ? `Updated ${formatDateTime(createdAt)}` : "Indexed source"}
        </div>
        {sourceLink ? (
          <a
            href={sourceLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-bg/55 px-3 py-2 text-xs font-medium text-fg transition hover:border-accent/40 hover:bg-white/5"
          >
            Open source
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Source link unavailable</span>
        )}
      </div>
    </article>
  );
}
