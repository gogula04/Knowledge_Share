"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

type SettingsPayload = {
  roles: Array<{ key: string; name: string; description: string }>;
  staleDays: number;
  authorityWeights: Record<string, number>;
  sourceCategories: string[];
  teams: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    lead_user_id: string | null;
  }>;
  users: Array<{
    id: string;
    email: string;
    display_name: string;
    role: string;
    is_active: boolean;
  }>;
};

export function SettingsWorkspace({ initialSettings }: { initialSettings: SettingsPayload }) {
  const [settings, setSettings] = useState(initialSettings);
  const [staleDays, setStaleDays] = useState(String(initialSettings.staleDays));
  const [authorityWeights, setAuthorityWeights] = useState(JSON.stringify(initialSettings.authorityWeights, null, 2));
  const [sourceCategories, setSourceCategories] = useState(initialSettings.sourceCategories.join(", "));

  async function saveGlobalSettings() {
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staleDaysDefault: Number(staleDays),
          authorityWeights: JSON.parse(authorityWeights),
          sourceCategories: sourceCategories
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        })
      });
      if (!response.ok) throw new Error("Failed to update settings.");
      toast.success("Settings updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update settings.");
    }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role })
      });
      if (!response.ok) throw new Error("Failed to update role.");
      setSettings((current) => ({
        ...current,
        users: current.users.map((user) => (user.id === userId ? { ...user, role } : user))
      }));
      toast.success("User role updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role.");
    }
  }

  async function updateTeam(teamId: string, payload: { name?: string; slug?: string; description?: string | null; leadUserId?: string | null }) {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Failed to update team.");
      setSettings((current) => ({
        ...current,
        teams: current.teams.map((team) =>
          team.id === teamId
            ? {
                ...team,
                ...(payload.name !== undefined ? { name: payload.name } : {}),
                ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
                ...(payload.description !== undefined ? { description: payload.description } : {}),
                ...(payload.leadUserId !== undefined ? { lead_user_id: payload.leadUserId } : {})
              }
            : team
        )
      }));
      toast.success("Team updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update team.");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle>System settings</CardTitle>
          <CardDescription>Control document freshness, authority rules, and category defaults.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Stale threshold days</span>
            <Input value={staleDays} onChange={(event) => setStaleDays(event.target.value)} />
          </label>
          <label className="space-y-2 xl:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Source authority weights JSON</span>
            <Textarea value={authorityWeights} onChange={(event) => setAuthorityWeights(event.target.value)} className="min-h-[140px] font-mono text-xs" />
          </label>
          <label className="space-y-2 xl:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Source categories</span>
            <Input value={sourceCategories} onChange={(event) => setSourceCategories(event.target.value)} />
          </label>
          <div className="flex items-end">
            <Button onClick={saveGlobalSettings} className="w-full">
              Save settings
            </Button>
          </div>
          <div className="xl:col-span-3 grid gap-3 md:grid-cols-3">
            {settings.roles.map((role) => (
              <div key={role.key} className="rounded-2xl border border-border/80 bg-bg/40 p-4">
                <p className="text-sm font-medium">{role.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Roles and access</CardTitle>
            <CardDescription>Assign user roles that gate workspace management capabilities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.users.map((user) => (
              <div key={user.id} className="rounded-2xl border border-border/80 bg-bg/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{user.display_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge tone={user.role === "admin" ? "success" : user.role === "team_lead" ? "default" : "muted"}>{user.role}</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  {(["normal", "team_lead", "admin"] as const).map((role) => (
                    <Button key={role} size="sm" variant={user.role === role ? "default" : "secondary"} onClick={() => updateUserRole(user.id, role)}>
                      {role}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>Update team metadata and the assigned lead.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settings.teams.map((team) => (
              <div key={team.id} className="rounded-2xl border border-border/80 bg-bg/40 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Team name</span>
                    <Input value={team.name} onChange={(event) => updateTeam(team.id, { name: event.target.value })} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Slug</span>
                    <Input value={team.slug} onChange={(event) => updateTeam(team.id, { slug: event.target.value })} />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Description</span>
                    <Textarea value={team.description ?? ""} onChange={(event) => updateTeam(team.id, { description: event.target.value })} className="min-h-[100px]" />
                  </label>
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Lead user id</span>
                    <Input value={team.lead_user_id ?? ""} onChange={(event) => updateTeam(team.id, { leadUserId: event.target.value || null })} />
                  </label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
