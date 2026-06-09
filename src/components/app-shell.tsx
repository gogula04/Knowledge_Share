"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Sparkles,
  PanelsTopLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { type AuthUser } from "@/lib/auth";

type AppShellProps = {
  user: AuthUser;
  children: React.ReactNode;
  teams: { id: string; name: string; slug: string; is_lead: boolean }[];
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquareText },
  { href: "/library", label: "Knowledge Library", icon: BookOpenText },
  { href: "/use-cases", label: "Use Cases", icon: PanelsTopLeft },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings2 }
];

export function AppShell({ user, children, teams }: AppShellProps) {
  const pathname = usePathname();
  const primaryTeam = teams[0] ?? null;
  const roleLabel = user.role === "admin" ? "Admin" : user.role === "team_lead" ? "Team Lead" : "Normal User";
  const workspaceHref = user.role === "admin" ? "/workspace/common" : user.role === "team_lead" ? "/workspace/team" : "/library";
  const workspaceLabel = user.role === "admin" ? "Open common workspace" : user.role === "team_lead" ? "Open team workspace" : "Browse library";
  const profileHref = user.role === "admin" ? "/settings" : user.role === "team_lead" ? "/workspace/team" : "/library";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--accent)/0.12),transparent_38%),linear-gradient(180deg,hsl(var(--bg)),hsl(var(--bg)))] text-fg">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="hidden w-[290px] shrink-0 border-r border-border/80 bg-panel/50 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-border/80 px-6 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/14 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">FMS Knowledge Workspace</p>
              <p className="truncate text-sm font-semibold text-fg">{primaryTeam ? primaryTeam.name : "Shared Knowledge"}</p>
            </div>
          </div>

          <div className="flex-1 px-4 py-5">
            <div className="rounded-2xl border border-border/80 bg-bg/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Current Access</p>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{roleLabel}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Badge tone={user.role === "admin" ? "success" : "default"}>{user.role}</Badge>
              </div>
            </div>

            <nav className="mt-6 space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-fg shadow-glow"
                        : "text-muted-foreground hover:bg-white/5 hover:text-fg"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-border/80 p-4">
            <div className="rounded-2xl border border-border/80 bg-bg/45 p-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Workspace Selector</p>
              <Link
                href={workspaceHref}
                className="mt-3 flex w-full items-center justify-between rounded-xl border border-border/80 bg-panel px-3 py-2 text-left text-sm transition hover:border-accent/40 hover:bg-white/5"
              >
                <div>
                  <p className="font-medium text-fg">{workspaceLabel}</p>
                  <p className="text-xs text-muted-foreground">{teams.length > 1 ? `${teams.length} team spaces available` : "Shared engineering knowledge"}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
            <Button asChild variant="ghost" className="mt-3 w-full justify-start text-muted-foreground">
              <a href="/api/auth/logout">
                <LogOut className="h-4 w-4" />
                Change role
              </a>
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-border/80 bg-bg/80 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 xl:px-8">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">Internal AI Knowledge Platform</p>
                <h1 className="truncate text-lg font-semibold text-fg">{primaryTeam ? `${primaryTeam.name} Workspace` : "Common Workspace"}</h1>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button asChild variant="secondary" size="sm" className="hidden md:inline-flex">
                  <Link href={profileHref}>
                    <CircleUserRound className="h-4 w-4" />
                    {user.displayName}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground md:px-6 xl:px-8">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              Role-based access active.
              <span className="mx-1 h-1 w-1 rounded-full bg-border" />
              Source citations required on every answer.
              <span className="mx-1 h-1 w-1 rounded-full bg-border" />
              Team workspace sources are preferred for team-specific questions.
            </div>

            <nav className="flex gap-2 overflow-x-auto border-t border-border/70 px-4 py-3 lg:hidden scrollbar-thin md:px-6">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors",
                      active ? "border-accent/40 bg-accent text-accent-fg" : "border-border/80 bg-panel/70 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="flex-1 p-4 md:p-6 xl:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
