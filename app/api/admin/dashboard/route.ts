import { createSupabaseAdminClient } from "../../auth/server";
import { adminError, adminJson, requireAdmin } from "../server";

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const supabase = createSupabaseAdminClient();
    const [ordersResult, stockResult] = await Promise.all([
      supabase
        .from("payment_orders")
        .select("out_trade_no,status,amount,billing_mode,product_name,delivery_email,created_at")
        .order("created_at", { ascending: false })
        .limit(10000),
      supabase.from("gemini_account_inventory").select("status"),
    ]);
    if (ordersResult.error) throw ordersResult.error;
    if (stockResult.error) throw stockResult.error;

    const orders = ordersResult.data ?? [];
    const paidStatuses = new Set(["paid", "fulfilled"]);
    const metrics = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((order) => order.status === "pending").length,
      awaitingFulfillment: orders.filter(
        (order) => order.billing_mode === "monthly" && order.status === "paid",
      ).length,
      revenue: orders
        .filter((order) => paidStatuses.has(order.status))
        .reduce((sum, order) => sum + Number(order.amount), 0),
      availableStock: (stockResult.data ?? []).filter(
        (item) => item.status === "available",
      ).length,
    };

    return adminJson(
      { metrics, recentOrders: orders.slice(0, 8) },
      request,
      admin,
    );
  } catch (error) {
    return adminError(error, request);
  }
}
