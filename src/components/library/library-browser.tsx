"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Filter, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Resource = {
  id: string;
  title: string;
  sourceType: string;
  workspaceType: "team" | "common";
  teamName: string | null;
  uploadedBy: string;
  createdAt: string;
  lastIndexedAt: string | null;
  originalSourceLink: string | null;
  fileName: string | null;
  category: string | null;
  tags: string[];
  accessScope: string;
  sourceAuthorityLevel: number;
  freshStatus: "fresh" | "stale" | "unknown";
  excerpt?: string;
};

const filterDefaults = {
  workspaceType: "all",
  freshness: "all",
  search: "",
  tag: "",
  category: "",
  sourceType: "all"
};

export function LibraryBrowser() {
  const [filters, setFilters] = useState(filterDefaults);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.workspaceType !== "all") params.set("workspaceType", filters.workspaceType);
    if (filters.freshness !== "all") params.set("freshness", filters.freshness);
    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.tag.trim()) params.set("tag", filters.tag.trim());
    if (filters.category.trim()) params.set("category", filters.category.trim());
    if (filters.sourceType !== "all") params.set("sourceType", filters.sourceType);
    params.set("limit", "100");
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/resources?${queryString}`);
        const data = await response.json();
        if (!cancelled) {
          setResources(data.resources ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Knowledge library</CardTitle>
              <CardDescription>Browse all indexed resources across the workspaces you can access.</CardDescription>
            </div>
            <Badge tone="muted">{resources.length} resources</Badge>
          </div>
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.5fr_0.5fr_0.6fr_0.7fr_0.6fr_auto]">
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} className="pl-10" placeholder="Title, link, summary..." />
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Workspace</span>
              <select
                value={filters.workspaceType}
                onChange={(event) => setFilters((current) => ({ ...current, workspaceType: event.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-panel px-3 text-sm outline-none"
              >
                <option value="all">All</option>
                <option value="team">Team</option>
                <option value="common">Common</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Source type</span>
              <select
                value={filters.sourceType}
                onChange={(event) => setFilters((current) => ({ ...current, sourceType: event.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-panel px-3 text-sm outline-none"
              >
                <option value="all">All</option>
                <option value="GitLab Page">GitLab Page</option>
                <option value="README">README</option>
                <option value="Wiki">Wiki</option>
                <option value="Jira">Jira</option>
                <option value="SharePoint">SharePoint</option>
                <option value="PDF">PDF</option>
                <option value="PPT">PPT</option>
                <option value="Image">Image</option>
                <option value="Manual Note">Manual Note</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Freshness</span>
              <select
                value={filters.freshness}
                onChange={(event) => setFilters((current) => ({ ...current, freshness: event.target.value }))}
                className="h-10 w-full rounded-xl border border-border bg-panel px-3 text-sm outline-none"
              >
                <option value="all">All</option>
                <option value="fresh">Fresh</option>
                <option value="stale">Stale</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Tag</span>
              <Input value={filters.tag} onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))} placeholder="docker, onboarding..." />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Category</span>
              <Input value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))} placeholder="Setup, Troubleshooting..." />
            </label>
            <div className="flex items-end gap-2">
              <Button variant="secondary" className="w-full" onClick={() => setFilters(filterDefaults)}>
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-3xl border border-border/80">
            <div className="grid grid-cols-[2.2fr_0.8fr_0.9fr_0.8fr_0.9fr] border-b border-border/80 bg-bg/40 px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              <div>Resource</div>
              <div>Workspace</div>
              <div>Category</div>
              <div>Freshness</div>
              <div>Authority</div>
            </div>
            <div className="divide-y divide-border/80">
              {loading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading resources...</div>
              ) : resources.length ? (
                resources.map((resource) => (
                  <div key={resource.id} className="grid grid-cols-[2.2fr_0.8fr_0.9fr_0.8fr_0.9fr] gap-3 px-4 py-4 hover:bg-white/[0.03]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{resource.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{resource.excerpt}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {resource.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} tone="muted">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {resource.workspaceType === "team" ? resource.teamName ?? "Team workspace" : "Common workspace"}
                    </div>
                    <div className="text-sm text-muted-foreground">{resource.category ?? "Uncategorized"}</div>
                    <div>
                      <Badge tone={resource.freshStatus === "fresh" ? "success" : resource.freshStatus === "stale" ? "warning" : "muted"}>
                        {resource.freshStatus}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">A{resource.sourceAuthorityLevel}</div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-sm text-muted-foreground">No resources matched the current filters.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
