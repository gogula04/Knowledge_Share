import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { getCurrentUser } from "@/lib/auth";
import { getSettingsOverview } from "@/lib/settings";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }

  const settings = await getSettingsOverview();
  return <SettingsWorkspace initialSettings={settings as any} />;
}
