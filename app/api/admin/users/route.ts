import { createSupabaseAdminClient } from "../../auth/server";
import { adminError, adminJson, requireAdmin, writeAuditLog } from "../server";

type OverviewRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  report_balance: number;
  ask_remaining: number;
  view_count: number;
  paid_amount: number;
};

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const supabase = createSupabaseAdminClient();

    const [overview, daily] = await Promise.all([
      supabase.rpc("admin_user_overview"),
      supabase.rpc("admin_daily_new_users", { p_days: 30 }),
    ]);
    if (overview.error) throw overview.error;
    if (daily.error) throw daily.error;

    const users = (overview.data ?? []) as unknown as OverviewRow[];
    const dailyRows = (daily.data ?? []) as unknown as Array<{ day: string; count: number }>;

    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = Date.now() - 7 * 86_400_000;
    const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
    const metrics = {
      totalUsers: users.length,
      dnu: dailyRows.find((row) => row.day.slice(0, 10) === today)?.count ?? 0,
      newIn7d: users.filter((row) => new Date(row.created_at).getTime() >= sevenDaysAgo).length,
      newIn30d: users.filter((row) => new Date(row.created_at).getTime() >= thirtyDaysAgo).length,
      payingUsers: users.filter((row) => Number(row.paid_amount) > 0).length,
      revenue: users.reduce((sum, row) => sum + Number(row.paid_amount), 0),
    };

    return adminJson({ metrics, daily: dailyRows, users }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const payload = await request.json() as { userId?: string; credits?: number };
    const userId = String(payload.userId ?? "");
    const credits = Number(payload.credits ?? 0);
    if (!/^[0-9a-f-]{36}$/iu.test(userId) || !Number.isInteger(credits) || credits <= 0 || credits > 1000) {
      return adminJson({ error: "invalid_input" }, request, admin, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("admin_grant_credits", { p_user_id: userId, p_credits: credits });
    if (error) throw error;

    await writeAuditLog(admin, "grant_credits", "user", userId, { credits });
    return adminJson({ ok: true }, request, admin);
  } catch (error) {
    return adminError(error, request);
  }
}
