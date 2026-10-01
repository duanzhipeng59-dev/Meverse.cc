import { adminError, adminJson, requireAdmin, writeAuditLog } from "../server";
import { isUpgradesEnabled, setUpgradesEnabled } from "../../../myfate-settings";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    return adminJson({ upgradesEnabled: await isUpgradesEnabled() }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const payload = await request.json() as { upgradesEnabled?: unknown };
    if (typeof payload.upgradesEnabled !== "boolean") {
      return adminJson({ error: "invalid_input" }, request, admin, { status: 400 });
    }
    await setUpgradesEnabled(payload.upgradesEnabled);
    await writeAuditLog(admin, "toggle_upgrades", "app_settings", "upgrades_enabled", { enabled: payload.upgradesEnabled });
    return adminJson({ upgradesEnabled: payload.upgradesEnabled }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}
