import {
  getOrder,
  jsonResponse,
  refreshOrderFromProvider,
} from "../server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderNo = url.searchParams.get("order") ?? "";
    const accessToken = url.searchParams.get("token") ?? "";
    if (!orderNo || !accessToken) {
      return jsonResponse({ error: "invalid_order" }, { status: 400 });
    }
    let order = await getOrder(orderNo, accessToken);
    if (!order) {
      return jsonResponse({ error: "order_not_found" }, { status: 404 });
    }
    if (order.status === "pending") {
      try {
        order = await refreshOrderFromProvider(order);
      } catch (error) {
        console.error("Payment status refresh failed", error);
      }
    }

    const response: Record<string, unknown> = {
      orderNo: order.out_trade_no,
      status: order.status,
      billingMode: order.billing_mode,
      durationMonths: order.duration_months,
      productName: order.product_name,
      amount: Number(order.amount).toFixed(2),
      deliveryEmail: order.delivery_email,
      region: order.account_region,
    };
    return jsonResponse(response);
  } catch (error) {
    console.error("Failed to read payment status", error);
    return jsonResponse({ error: "payment_unavailable" }, { status: 503 });
  }
}
