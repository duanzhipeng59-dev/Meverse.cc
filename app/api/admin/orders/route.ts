import { createSupabaseAdminClient } from "../../auth/server";
import { adminError, adminJson, requireAdmin } from "../server";

const VALID_STATUSES = new Set([
  "pending",
  "paid",
  "fulfilled",
  "failed",
  "cancelled",
  "returned",
]);

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const url = new URL(request.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = 20;
    const status = url.searchParams.get("status") ?? "all";
    const queryText = url.searchParams.get("q")?.trim().slice(0, 120) ?? "";
    const from = (page - 1) * pageSize;
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from("payment_orders")
      .select(
        "out_trade_no,billing_mode,duration_months,product_name,amount,payment_type,delivery_email,account_region,status,provider_trade_no,created_at,paid_at,fulfilled_at,cancelled_at,returned_at,return_reason,updated_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (VALID_STATUSES.has(status)) query = query.eq("status", status);
    if (queryText) {
      const escaped = queryText.replace(/[,%()]/g, "");
      query = query.or(
        `out_trade_no.ilike.%${escaped}%,delivery_email.ilike.%${escaped}%,provider_trade_no.ilike.%${escaped}%`,
      );
    }
    const { data, error, count } = await query;
    if (error) throw error;
    return adminJson(
      { orders: data ?? [], page, pageSize, total: count ?? 0 },
      request,
      admin,
    );
  } catch (error) {
    return adminError(error, request);
  }
}
