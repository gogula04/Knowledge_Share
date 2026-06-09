import { getCurrentUser } from "@/lib/auth";
import { listResources } from "@/lib/resources";
import { WorkspaceAdmin } from "@/components/workspace/workspace-admin";
import { redirect } from "next/navigation";

export default async function CommonWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const resources = await listResources(user, { workspaceType: "common", limit: 100 });

  return <WorkspaceAdmin workspaceType="common" resources={resources} />;
}
