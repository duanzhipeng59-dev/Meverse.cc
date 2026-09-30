import { createSupabaseAdminClient } from "../../../auth/server";
import {
  createAccessToken,
  createOrderNumber,
  getPublicOrigin,
  hashAccessToken,
  amountsMatch,
  jsonResponse,
  verifyCallback,
  createProviderCheckout,
  type PaymentOrder,
} from "../server";

export const REPORT_PACKAGES = {
  trial: { credits: 3, amount: "89.00", name: "报告次数包 × 3" },
  explore: { credits: 10, amount: "239.00", name: "报告次数包 × 10" },
  deep: { credits: 30, amount: "499.00", name: "报告次数包 × 30" },
  single: { credits: 1, amount: "50.00", name: "单次报告" },
} as const;

export type ReportPackageId = keyof typeof REPORT_PACKAGES;

export function isReportPackageId(value: string): value is ReportPackageId {
  return value in REPORT_PACKAGES;
}

export type ReportCreditOrder = {
  out_trade_no: string;
  access_token_hash: string;
  user_id: string;
  package_id: ReportPackageId;
  credits: number;
  amount: string | number;
  status: "pending" | "paid" | "cancelled";
  provider_trade_no: string | null;
  paid_at: string | null;
  created_at: string;
};

export function isCreditOrderNo(orderNo: string) {
  return orderNo.startsWith("RC");
}

function createCreditOrderNumber() {
  return `RC${createOrderNumber().slice(2)}`;
}

export async function createCreditCheckout({
  request,
  userId,
  packageId,
}: {
  request: Request;
  userId: string;
  packageId: ReportPackageId;
}) {
  const pack = REPORT_PACKAGES[packageId];
  const orderNo = createCreditOrderNumber();
  const accessToken = createAccessToken();
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("create_report_credit_order", {
    p_order_no: orderNo,
    p_user_id: userId,
    p_package_id: packageId,
    p_token_hash: hashAccessToken(accessToken),
  });
  if (error) throw error;

  const userAgent = request.headers.get("user-agent") ?? "";
  const device = /android|iphone|ipad|mobile/u.test(userAgent) ? "mobile" as const : "pc" as const;
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  const origin = getPublicOrigin(request);
  const checkout = await createProviderCheckout({
    orderNo,
    product: pack,
    notifyUrl: `${origin}/api/payments/epay/notify`,
    clientIp,
    device,
  });
  return { ...checkout, orderNo, accessToken };
}

export async function getCreditOrder(orderNo: string, accessToken?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("report_credit_orders")
    .select("out_trade_no,access_token_hash,user_id,package_id,credits,amount,status,provider_trade_no,paid_at,created_at")
    .eq("out_trade_no", orderNo);
  if (accessToken) {
    query = query.eq("access_token_hash", hashAccessToken(accessToken));
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as ReportCreditOrder | null;
}

async function fulfillCreditOrder(order: ReportCreditOrder, providerTradeNo: string, providerPayload: Record<string, unknown>) {
  const { error } = await createSupabaseAdminClient().rpc("fulfill_report_credit_order", {
    p_out_trade_no: order.out_trade_no,
    p_provider_trade_no: providerTradeNo,
    p_provider_payload: providerPayload,
  });
  if (error) throw error;
}

export async function acceptCreditPayment(payload: Record<string, string>) {
  const orderNo = payload.out_trade_no;
  if (!orderNo) throw new Error("ORDER_NOT_FOUND");
  const order = await getCreditOrder(orderNo);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  const pack = REPORT_PACKAGES[order.package_id];
  if (!pack || !amountsMatch(order.amount, payload.money)) {
    throw new Error("ORDER_MISMATCH");
  }
  await fulfillCreditOrder(order, payload.trade_no ?? "", payload);
  return order;
}

export async function refreshCreditOrderFromProvider(order: ReportCreditOrder) {
  if (order.status !== "pending") return order;
  const pid = process.env.EPAY_PID;
  const key = process.env.EPAY_KEY;
  const apiUrl = (process.env.EPAY_API_URL ?? "https://zpayz.cn/").replace(/\/?$/u, "/");
  if (!pid || !key) return order;
  const queryUrl = new URL("api.php", apiUrl);
  queryUrl.search = new URLSearchParams({ act: "order", pid, key, out_trade_no: order.out_trade_no }).toString();
  const response = await fetch(queryUrl, { headers: { accept: "application/json" }, cache: "no-store" });
  if (!response.ok) return order;
  const result = (await response.json()) as Record<string, unknown>;
  const paid = Number(result.code) === 1 && (Number(result.status) === 1 || result.trade_status === "TRADE_SUCCESS");
  if (!paid || String(result.out_trade_no ?? "") !== order.out_trade_no || !amountsMatch(order.amount, String(result.money ?? ""))) {
    return order;
  }
  await fulfillCreditOrder(order, String(result.trade_no ?? ""), result);
  return (await getCreditOrder(order.out_trade_no)) ?? order;
}

// ── Report generation credit gates ─────────────────────────────────────────

export async function consumeReportCredit(userId: string): Promise<number> {
  const { data, error } = await createSupabaseAdminClient().rpc("consume_report_credit", { p_user_id: userId });
  if (error) {
    if (error.message.includes("INSUFFICIENT_CREDITS")) return -1;
    throw error;
  }
  return typeof data === "number" ? data : -1;
}

export async function getReportCredits(userId: string): Promise<number> {
  const { data, error } = await createSupabaseAdminClient().rpc("get_report_credits", { p_user_id: userId });
  if (error) throw error;
  return typeof data === "number" ? data : 0;
}

export { jsonResponse, verifyCallback };

export type { PaymentOrder };
