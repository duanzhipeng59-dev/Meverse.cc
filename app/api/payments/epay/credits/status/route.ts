import { jsonResponse } from "../../server";
import { cancelStalePendingCreditOrders, getCreditOrder, getReportCredits, refreshCreditOrderFromProvider } from "../server";
import { getSessionUser } from "../../../../auth/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderNo = url.searchParams.get("order") ?? "";
    const accessToken = url.searchParams.get("token") ?? "";
    if (!orderNo || !accessToken) {
      return jsonResponse({ error: "invalid_order" }, { status: 400 });
    }
    // 顺带清理长期 pending 的过期订单(幂等,失败不影响状态查询)
    void cancelStalePendingCreditOrders().catch(() => undefined);
    let order = await getCreditOrder(orderNo, accessToken);
    if (!order) {
      return jsonResponse({ error: "order_not_found" }, { status: 404 });
    }
    if (order.status === "pending") {
      try {
        order = await refreshCreditOrderFromProvider(order);
      } catch (error) {
        console.error("Credit order status refresh failed", error);
      }
    }
    const { user } = await getSessionUser(request);
    const credits = user?.id ? await getReportCredits(user.id).catch(() => null) : null;
    return jsonResponse({
      orderNo: order.out_trade_no,
      status: order.status,
      packageId: order.package_id,
      credits: order.credits,
      amount: Number(order.amount).toFixed(2),
      paidAt: order.paid_at,
      balance: credits,
    });
  } catch (error) {
    console.error("Failed to read credit order status", error);
    return jsonResponse({ error: "payment_unavailable" }, { status: 503 });
  }
}
