import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ShieldCheck, Sparkles, Workflow } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen app-grid-bg">
      <div className="mx-auto grid min-h-screen max-w-[1440px] gap-8 px-4 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="flex items-center">
          <div className="max-w-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/12 text-accent">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge tone="muted">Internal Knowledge Platform</Badge>
            </div>

            <h1 className="text-4xl font-semibold tracking-tight text-fg md:text-6xl">
              Choose your role, then step into source-backed engineering knowledge.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">
              FMS Knowledge Workspace keeps GitLab pages, wikis, uploaded documents, and troubleshooting notes searchable
              inside a role-aware RAG assistant. No password wall, just a role choice for the session you want.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Card className="p-4">
                <ShieldCheck className="h-5 w-5 text-success" />
                <p className="mt-3 text-sm font-semibold">RBAC protected</p>
                <p className="mt-1 text-sm text-muted-foreground">Users only see workspaces they are allowed to access.</p>
              </Card>
              <Card className="p-4">
                <Workflow className="h-5 w-5 text-accent" />
                <p className="mt-3 text-sm font-semibold">RAG pipeline</p>
                <p className="mt-1 text-sm text-muted-foreground">Links and files are extracted, chunked, embedded, and cited.</p>
              </Card>
              <Card className="p-4">
                <Sparkles className="h-5 w-5 text-info" />
                <p className="mt-3 text-sm font-semibold">Fast onboarding</p>
                <p className="mt-1 text-sm text-muted-foreground">New engineers can find setup steps and fixes in minutes.</p>
              </Card>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <Suspense fallback={<div className="h-[560px] w-full max-w-[470px] rounded-2xl border border-border/80 bg-panel/80" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
