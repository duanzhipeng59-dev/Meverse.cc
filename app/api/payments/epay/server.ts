import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { createSupabaseAdminClient } from "../../auth/server";

export type BillingMode = "monthly" | "annual";
export type MonthlyDuration = 1 | 3 | 6 | 12;

export const PRODUCTS = {
  monthly_1: {
    billingMode: "monthly" as const,
    durationMonths: 1 as const,
    name: "Gemini 家庭组 1 个月",
    amount: "19.9",
  },
  monthly_3: {
    billingMode: "monthly" as const,
    durationMonths: 3 as const,
    name: "Gemini 家庭组 3 个月",
    amount: "49.9",
  },
  monthly_6: {
    billingMode: "monthly" as const,
    durationMonths: 6 as const,
    name: "Gemini 家庭组 6 个月",
    amount: "89.9",
  },
  monthly_12: {
    billingMode: "monthly" as const,
    durationMonths: 12 as const,
    name: "Gemini 家庭组 12 个月",
    amount: "145.00",
  },
};

export type Product = (typeof PRODUCTS)[keyof typeof PRODUCTS];

export type PaymentOrder = {
  out_trade_no: string;
  access_token_hash: string;
  user_id: string | null;
  billing_mode: BillingMode;
  duration_months: number;
  product_name: string;
  amount: string | number;
  delivery_email: string;
  account_region: string | null;
  status: "pending" | "paid" | "fulfilled" | "failed" | "cancelled" | "returned";
  provider_trade_no: string | null;
  inventory_id: string | null;
  created_at: string;
};

function gatewayConfig() {
  const pid = process.env.EPAY_PID;
  const key = process.env.EPAY_KEY;
  const apiUrl = process.env.EPAY_API_URL ?? "https://zpayz.cn/";
  if (!pid || !key) {
    throw new Error("EPAY_PID and EPAY_KEY are required");
  }
  const parsedUrl = new URL(apiUrl);
  if (parsedUrl.protocol !== "https:") {
    throw new Error("EPAY_API_URL must use HTTPS");
  }
  if (parsedUrl.hostname === "z-pay.cn") {
    parsedUrl.hostname = "zpayz.cn";
  }
  return { pid, key, apiUrl: parsedUrl.toString() };
}

export function getPublicOrigin(request: Request) {
  const configured = process.env.PUBLIC_APP_URL;
  if (configured) return new URL(configured).origin;

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  if (forwardedHost) {
    return `${forwardedProtocol === "http" ? "http" : "https"}://${forwardedHost}`;
  }
  return requestUrl.origin;
}

export function createOrderNumber() {
  const timestamp = new Date()
    .toISOString()
    .replace(/\D/g, "")
    .slice(0, 14);
  return `WG${timestamp}${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function createAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function signPayload(payload: Record<string, string>, key: string) {
  const canonical = Object.entries(payload)
    .filter(
      ([name, value]) =>
        name !== "sign" && name !== "sign_type" && value !== "",
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  return createHash("md5").update(`${canonical}${key}`).digest("hex");
}

function safeHttpsUrl(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseProviderResult(value: unknown): Record<string, unknown> {
  let parsed = value;
  for (let depth = 0; depth < 2 && typeof parsed === "string"; depth += 1) {
    parsed = JSON.parse(parsed) as unknown;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("EPAY_CHECKOUT_INVALID_RESPONSE");
  }
  return parsed as Record<string, unknown>;
}

export async function createProviderCheckout({
  orderNo,
  product,
  notifyUrl,
  clientIp,
  device,
}: {
  orderNo: string;
  product: Product;
  notifyUrl: string;
  clientIp: string;
  device: "mobile" | "pc";
}) {
  const { pid, key, apiUrl } = gatewayConfig();
  const payload: Record<string, string> = {
    pid,
    type: "alipay",
    notify_url: notifyUrl,
    out_trade_no: orderNo,
    name: product.name,
    money: Number(product.amount).toFixed(2),
    clientip: clientIp,
    device,
    param: orderNo,
    sign_type: "MD5",
  };
  payload.sign = signPayload(payload, key);

  const response = await fetch(new URL("mapi.php", apiUrl), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(payload),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("EPAY_CHECKOUT_UNAVAILABLE");

  const result = parseProviderResult(await response.text());
  if (Number(result.code) !== 1) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "EPay rejected checkout request",
        providerCode: result.code ?? null,
        providerMessage:
          result.msg ?? result.message ?? result.error ?? "unknown",
      }),
    );
    throw new Error("EPAY_CHECKOUT_FAILED");
  }

  const checkoutUrl = safeHttpsUrl(result.payurl);
  const qrContent = safeHttpsUrl(result.qrcode) ?? checkoutUrl;
  if (!checkoutUrl || !qrContent) throw new Error("EPAY_CHECKOUT_INVALID");
  return { checkoutUrl, qrContent };
}

export function callbackPayload(params: URLSearchParams) {
  return Object.fromEntries(params.entries());
}

export function verifyCallback(payload: Record<string, string>) {
  const { pid, key } = gatewayConfig();
  if (payload.pid !== pid || payload.sign_type?.toUpperCase() !== "MD5") {
    return false;
  }
  const expected = Buffer.from(signPayload(payload, key), "utf8");
  const received = Buffer.from(payload.sign ?? "", "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function isSuccessfulPayment(payload: Record<string, string>) {
  return payload.trade_status === "TRADE_SUCCESS";
}

export function amountsMatch(left: string | number, right: string | number) {
  const leftCents = Math.round(Number(left) * 100);
  const rightCents = Math.round(Number(right) * 100);
  return Number.isFinite(leftCents) && leftCents === rightCents;
}

export async function getOrder(orderNo: string, accessToken?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("payment_orders")
    .select("*")
    .eq("out_trade_no", orderNo);
  if (accessToken) {
    query = query.eq("access_token_hash", hashAccessToken(accessToken));
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as PaymentOrder | null;
}

export async function fulfillOrder(
  order: PaymentOrder,
  providerTradeNo: string,
  providerPayload: Record<string, unknown>,
) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("fulfill_payment_order", {
    p_out_trade_no: order.out_trade_no,
    p_provider_trade_no: providerTradeNo,
    p_provider_payload: providerPayload,
  });
  if (error) throw error;
}

export async function acceptProviderPayment(
  payload: Record<string, string>,
) {
  const orderNo = payload.out_trade_no;
  if (!orderNo) throw new Error("ORDER_NOT_FOUND");
  const order = await getOrder(orderNo);
  if (!order) throw new Error("ORDER_NOT_FOUND");
  if (
    !amountsMatch(order.amount, payload.money) ||
    order.product_name !== payload.name
  ) {
    throw new Error("ORDER_MISMATCH");
  }
  await fulfillOrder(order, payload.trade_no ?? "", payload);
  return order;
}

export async function refreshOrderFromProvider(order: PaymentOrder) {
  if (order.status !== "pending") return order;
  const { pid, key, apiUrl } = gatewayConfig();
  const queryUrl = new URL("api.php", apiUrl);
  queryUrl.search = new URLSearchParams({
    act: "order",
    pid,
    key,
    out_trade_no: order.out_trade_no,
  }).toString();
  const response = await fetch(queryUrl, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return order;
  const result = (await response.json()) as Record<string, unknown>;
  const paid =
    Number(result.code) === 1 &&
    (Number(result.status) === 1 || result.trade_status === "TRADE_SUCCESS");
  if (
    !paid ||
    String(result.out_trade_no ?? "") !== order.out_trade_no ||
    !amountsMatch(order.amount, String(result.money ?? ""))
  ) {
    return order;
  }
  await fulfillOrder(
    order,
    String(result.trade_no ?? ""),
    result,
  );
  return (await getOrder(order.out_trade_no)) ?? order;
}

function credentialsKey() {
  const encoded = process.env.GEMINI_CREDENTIALS_KEY;
  if (!encoded) throw new Error("GEMINI_CREDENTIALS_KEY is required");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("GEMINI_CREDENTIALS_KEY must be 32 bytes in base64");
  }
  return key;
}

export function encryptCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialsKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptCredential(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Invalid encrypted credential");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    credentialsKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function jsonResponse(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}
