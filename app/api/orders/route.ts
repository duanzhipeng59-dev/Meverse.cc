import {
  appendSessionCookies,
  createSupabaseAdminClient,
  getSessionUser,
} from "../auth/server";

export async function GET(request: Request) {
  try {
    const { user, refreshedSession } = await getSessionUser(request);
    if (!user?.id) {
      return Response.json({ error: "login_required", orders: [] }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const expiry = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const cancelledAt = new Date().toISOString();
    const { error: expiryError } = await supabase
      .from("payment_orders")
      .update({
        status: "cancelled",
        cancelled_at: cancelledAt,
        updated_at: cancelledAt,
      })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lt("created_at", expiry);
    if (expiryError) throw expiryError;

    const { data, error } = await supabase
      .from("payment_orders")
      .select(
        "out_trade_no, billing_mode, duration_months, product_name, amount, payment_type, delivery_email, account_region, status, created_at, paid_at, fulfilled_at, cancelled_at, returned_at, return_reason",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const headers = new Headers();
    if (refreshedSession) {
      appendSessionCookies(headers, refreshedSession, request);
    }
    return Response.json({ orders: data ?? [] }, { headers });
  } catch (error) {
    console.error("Failed to list payment orders", error);
    return Response.json(
      { error: "orders_unavailable", orders: [] },
      { status: 503 },
    );
  }
}
