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
    const { data, error } = await supabase
      .from("payment_orders")
      .select(
        "out_trade_no, billing_mode, duration_months, product_name, amount, payment_type, delivery_email, account_region, status, created_at, paid_at, fulfilled_at",
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
