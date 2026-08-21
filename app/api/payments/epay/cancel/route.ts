import { createSupabaseAdminClient } from "../../../auth/server";
import { getOrder, jsonResponse } from "../server";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      orderNo?: string;
      accessToken?: string;
    };
    const orderNo = payload.orderNo?.trim() ?? "";
    const accessToken = payload.accessToken?.trim() ?? "";
    if (!orderNo || !accessToken) {
      return jsonResponse({ error: "invalid_order" }, { status: 400 });
    }

    const order = await getOrder(orderNo, accessToken);
    if (!order) {
      return jsonResponse({ error: "order_not_found" }, { status: 404 });
    }
    if (order.status !== "pending") {
      return jsonResponse({ ok: true, status: order.status });
    }

    const now = new Date().toISOString();
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("payment_orders")
      .update({ status: "cancelled", cancelled_at: now, updated_at: now })
      .eq("out_trade_no", orderNo)
      .eq("access_token_hash", order.access_token_hash)
      .eq("status", "pending")
      .select("status")
      .maybeSingle();
    if (error) throw error;
    return jsonResponse({ ok: true, status: data?.status ?? "cancelled" });
  } catch (error) {
    console.error("Failed to cancel payment order", error);
    return jsonResponse({ error: "cancel_unavailable" }, { status: 503 });
  }
}
