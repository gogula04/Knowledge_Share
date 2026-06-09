import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettingsOverview, updateSystemSetting } from "@/lib/settings";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getSettingsOverview();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (body?.staleDaysDefault !== undefined) {
    await updateSystemSetting(user, "stale_days_default", Number(body.staleDaysDefault));
  }
  if (body?.authorityWeights) {
    await updateSystemSetting(user, "authority_weights", body.authorityWeights);
  }
  if (body?.sourceCategories) {
    await updateSystemSetting(user, "source_categories", body.sourceCategories);
  }

  return NextResponse.json({ ok: true });
}

