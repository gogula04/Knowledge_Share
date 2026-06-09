"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCcw, Upload, Link2, Users2, PencilLine, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

type Member = {
  user_id: string;
  email: string;
  display_name: string;
  is_lead: boolean;
  member_title: string | null;
};

type TeamItem = {
  id: string;
  name: string;
  slug: string;
  is_lead: boolean;
};

type WorkspaceAdminProps = {
  workspaceType: "team" | "common";
  selectedTeamId?: string | null;
  teams?: TeamItem[];
  resources: Resource[];
  members?: Member[];
};

function EditableResourceRow({ resource, onSaved }: { resource: Resource; onSaved: () => void }) {
  const [title, setTitle] = useState(resource.title);
  const [category, setCategory] = useState(resource.category ?? "");
  const [tags, setTags] = useState(resource.tags.join(", "));
  const [authority, setAuthority] = useState(String(resource.sourceAuthorityLevel));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function save() {
    const response = await fetch(`/api/resources/${resource.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category: category || null,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        authority: Number(authority)
      })
    });
    if (!response.ok) throw new Error("Unable to update resource.");
    toast.success("Resource updated.");
    onSaved();
    router.refresh();
  }

  async function reindex() {
    const response = await fetch(`/api/resources/${resource.id}/reindex`, { method: "POST" });
    if (!response.ok) throw new Error("Unable to queue reindex.");
    toast.success("Reindex queued.");
  }

  async function remove() {
    const response = await fetch(`/api/resources/${resource.id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Unable to delete resource.");
    toast.success("Resource deleted.");
    onSaved();
    router.refresh();
  }

  return (
    <div className="rounded-3xl border border-border/80 bg-bg/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{resource.title}</p>
          <p className="text-xs text-muted-foreground">
            {resource.sourceType} • {resource.workspaceType === "team" ? resource.teamName ?? "Team Workspace" : "Common Workspace"} • {resource.freshStatus}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={reindex} disabled={pending}>
            <RefreshCcw className="h-4 w-4" />
            Re-index
          </Button>
          <Button size="sm" variant="danger" onClick={remove} disabled={pending}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Title</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Category</span>
          <Input value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <label className="space-y-2">
          <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Tags</span>
          <Input value={tags} onChange={(event) => setTags(event.target.value)} />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Authority</span>
          <Input value={authority} onChange={(event) => setAuthority(event.target.value)} />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {resource.tags.map((tag) => (
            <Badge key={tag} tone="muted">
              {tag}
            </Badge>
          ))}
        </div>
        <Button size="sm" onClick={() => startTransition(() => void save())} disabled={pending}>
          <PencilLine className="h-4 w-4" />
          Save
        </Button>
      </div>
    </div>
  );
}

export function WorkspaceAdmin({ workspaceType, selectedTeamId, teams = [], resources, members = [] }: WorkspaceAdminProps) {
  const router = useRouter();
  const [linkForm, setLinkForm] = useState({
    title: "",
    url: "",
    category: "",
    tags: "",
    authority: workspaceType === "common" ? "5" : "4",
    sourceType: workspaceType === "common" ? "Other" : "README"
  });
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadAuthority, setUploadAuthority] = useState(workspaceType === "common" ? "5" : "4");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberTitle, setMemberTitle] = useState("");
  const [isLead, setIsLead] = useState(false);
  const [pending, startTransition] = useTransition();

  const endpointBase = useMemo(() => {
    return workspaceType === "common" ? "/api/workspaces/common/resources" : `/api/workspaces/team/${selectedTeamId}/resources`;
  }, [selectedTeamId, workspaceType]);

  async function submitLink() {
    const response = await fetch(`${endpointBase}/link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...linkForm,
        tags: linkForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      })
    });
    if (!response.ok) throw new Error("Failed to add link.");
    toast.success("Link added and queued for indexing.");
    setLinkForm({ title: "", url: "", category: "", tags: "", authority: workspaceType === "common" ? "5" : "4", sourceType: workspaceType === "common" ? "Other" : "README" });
    router.refresh();
  }

  async function submitUpload(form: HTMLFormElement) {
    const formData = new FormData(form);
    const response = await fetch(`${endpointBase}/upload`, {
      method: "POST",
      body: formData
    });
    if (!response.ok) throw new Error("Failed to upload file.");
    toast.success("File uploaded and queued for indexing.");
    form.reset();
    setUploadTitle("");
    setUploadCategory("");
    setUploadTags("");
    setUploadAuthority(workspaceType === "common" ? "5" : "4");
    router.refresh();
  }

  async function addMember() {
    if (workspaceType !== "team" || !selectedTeamId) return;
    const response = await fetch(`/api/workspaces/team/${selectedTeamId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: memberEmail, memberTitle, isLead })
    });
    if (!response.ok) throw new Error("Failed to add member.");
    toast.success("Team member updated.");
    setMemberEmail("");
    setMemberTitle("");
    setIsLead(false);
    router.refresh();
  }

  async function removeMember(memberId: string) {
    if (workspaceType !== "team" || !selectedTeamId) return;
    const response = await fetch(`/api/workspaces/team/${selectedTeamId}/members/${memberId}`, {
      method: "DELETE"
    });
    if (!response.ok) throw new Error("Failed to remove member.");
    toast.success("Member removed.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {workspaceType === "team" && teams.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {teams.map((team) => (
            <Button
              key={team.id}
              size="sm"
              variant={team.id === selectedTeamId ? "default" : "secondary"}
              onClick={() => router.push(`/workspace/team?teamId=${team.id}`)}
            >
              {team.name}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_0.78fr]">
        <Card className="border-border/80">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{workspaceType === "team" ? "Team workspace admin" : "Common workspace admin"}</CardTitle>
                <CardDescription>
                  Add links, upload documents, re-index stale content, and manage the source of truth.
                </CardDescription>
              </div>
              <Badge tone={workspaceType === "common" ? "success" : "default"}>
                {workspaceType === "common" ? "Global knowledge" : "Team knowledge"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border/80 bg-bg/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4" />
                    Add link
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Title" value={linkForm.title} onChange={(event) => setLinkForm((current) => ({ ...current, title: event.target.value }))} />
                  <Input placeholder="URL" value={linkForm.url} onChange={(event) => setLinkForm((current) => ({ ...current, url: event.target.value }))} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input placeholder="Category" value={linkForm.category} onChange={(event) => setLinkForm((current) => ({ ...current, category: event.target.value }))} />
                    <Input placeholder="Tags comma separated" value={linkForm.tags} onChange={(event) => setLinkForm((current) => ({ ...current, tags: event.target.value }))} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Input placeholder="Authority" value={linkForm.authority} onChange={(event) => setLinkForm((current) => ({ ...current, authority: event.target.value }))} />
                    <Input placeholder="Source type" value={linkForm.sourceType} onChange={(event) => setLinkForm((current) => ({ ...current, sourceType: event.target.value }))} />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      startTransition(() =>
                        void submitLink().catch((error) => toast.error(error instanceof Error ? error.message : "Failed to add link."))
                      )
                    }
                    disabled={pending}
                  >
                    <Plus className="h-4 w-4" />
                    Add link
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-bg/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Upload className="h-4 w-4" />
                    Upload file
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = event.currentTarget;
                      startTransition(() =>
                        void submitUpload(form).catch((error) => toast.error(error instanceof Error ? error.message : "Failed to upload file."))
                      );
                    }}
                  >
                    <Input name="title" placeholder="Title" value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} />
                    <Input name="category" placeholder="Category" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)} />
                    <Input name="tags" placeholder="Tags comma separated" value={uploadTags} onChange={(event) => setUploadTags(event.target.value)} />
                    <Input name="authority" placeholder="Authority" value={uploadAuthority} onChange={(event) => setUploadAuthority(event.target.value)} />
                    <input name="file" type="file" className="block w-full rounded-xl border border-dashed border-border bg-bg/30 px-3 py-2 text-sm" />
                    <Button className="w-full" type="submit" disabled={pending}>
                      Upload and index
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Indexed resources</p>
                  <p className="text-sm text-muted-foreground">Edit title, category, tags, and authority inline.</p>
                </div>
                <Badge tone="muted">{resources.length} items</Badge>
              </div>
              <div className="space-y-3">
                {resources.map((resource) => (
                  <EditableResourceRow key={resource.id} resource={resource} onSaved={() => router.refresh()} />
                ))}
                {!resources.length ? (
                  <div className="rounded-3xl border border-dashed border-border/80 bg-bg/20 p-6 text-sm text-muted-foreground">
                    No resources have been indexed yet.
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {workspaceType === "team" ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users2 className="h-4 w-4" />
                  Team members
                </CardTitle>
                <CardDescription>Manage who can access the team workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Member email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} />
                <Input placeholder="Member title" value={memberTitle} onChange={(event) => setMemberTitle(event.target.value)} />
                <label className="flex items-center gap-2 rounded-2xl border border-border/80 bg-bg/40 px-3 py-2 text-sm">
                  <input type="checkbox" checked={isLead} onChange={(event) => setIsLead(event.target.checked)} />
                  Team lead
                </label>
                <Button className="w-full" variant="secondary" onClick={() => void addMember().catch((error) => toast.error(error instanceof Error ? error.message : "Failed to add member."))}>
                  Add or update member
                </Button>
                <div className="space-y-2 pt-2">
                  {members.map((member) => (
                    <div key={member.user_id} className="rounded-2xl border border-border/80 bg-bg/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{member.display_name}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge tone={member.is_lead ? "success" : "muted"}>{member.is_lead ? "Lead" : "Member"}</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">{member.member_title ?? "No title set"}</p>
                        <Button size="sm" variant="danger" onClick={() => void removeMember(member.user_id)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!members.length ? (
                    <div className="rounded-2xl border border-dashed border-border/80 bg-bg/20 p-4 text-sm text-muted-foreground">
                      No team members have been assigned yet.
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                Governance notes
              </CardTitle>
              <CardDescription>How the workspace stays trustworthy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Re-index after changes to keep embeddings current and source citations fresh.</p>
              <p>Authority levels help rank trusted content above older or less reliable notes.</p>
              <p>Stale docs are surfaced in analytics so the team can fix missing or outdated guidance quickly.</p>
              <Button variant="outline" className="w-full" onClick={() => router.push("/analytics")}>
                View analytics
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
