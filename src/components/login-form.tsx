"use client";

import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type UserRole } from "@/lib/types";

const roleCards: Array<{
  role: UserRole;
  title: string;
  description: string;
  details: string;
  tone: "success" | "default" | "muted";
}> = [
  {
    role: "admin",
    title: "Admin",
    description: "Manage the common workspace, users, teams, categories, and global settings.",
    details: "Best for platform owners and workspace administrators.",
    tone: "success"
  },
  {
    role: "team_lead",
    title: "Team Lead",
    description: "Curate your team workspace, add sources, organize content, and manage team access.",
    details: "Best for leads who own a team knowledge space.",
    tone: "default"
  },
  {
    role: "normal",
    title: "Team Member",
    description: "Ask questions, browse allowed workspaces, and read cited answers without managing content.",
    details: "Best for engineers and other knowledge consumers.",
    tone: "muted"
  }
];

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  return (
    <Card className="w-full max-w-[540px] border-border/70 bg-panel/80 shadow-glow">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="muted">No password required</Badge>
          <Badge tone="default">Role-selected session</Badge>
        </div>
        <CardTitle className="text-2xl">Choose your access role</CardTitle>
        <CardDescription>
          Pick the way you want to enter the workspace. The same source-backed assistant opens for everyone, but each
          role gets the right management controls.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {roleCards.map((card) => (
            <a
              key={card.role}
              href={`/api/auth/login?role=${card.role}&next=${encodeURIComponent(next)}`}
              className="group block rounded-2xl border border-border/80 bg-bg/50 p-4 text-left transition hover:border-accent/40 hover:bg-white/5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold">{card.title}</p>
                    <Badge tone={card.tone}>{card.role}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
                </div>
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground transition group-hover:text-fg">
                  Continue
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{card.details}</p>
            </a>
          ))}
        </div>

        <div className="rounded-2xl border border-border/80 bg-bg/40 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">How it works</p>
          <p className="mt-2 text-sm text-muted-foreground">
            This local setup stores the selected role in a session cookie. You can switch roles at any time from the
            sidebar by choosing "Change role".
          </p>
          <Button asChild type="button" className="mt-4 w-full" variant="secondary">
            <a href={`/api/auth/login?role=normal&next=${encodeURIComponent(next)}`}>Enter as team member</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
