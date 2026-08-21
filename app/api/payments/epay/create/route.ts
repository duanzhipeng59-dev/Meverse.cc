import { getSessionUser } from "../../../auth/server";
import {
  createProviderCheckout,
  createAccessToken,
  createOrderNumber,
  getPublicOrigin,
  hashAccessToken,
  jsonResponse,
  PRODUCTS,
  type MonthlyDuration,
} from "../server";
import { createSupabaseAdminClient } from "../../../auth/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      billingMode?: "monthly";
      monthlyDuration?: MonthlyDuration;
      email?: string;
      region?: string;
    };
    const product =
      PRODUCTS[`monthly_${body.monthlyDuration}` as keyof typeof PRODUCTS];
    if (!product || product.billingMode !== body.billingMode) {
      return jsonResponse({ error: "invalid_product" }, { status: 400 });
    }

    const { user } = await getSessionUser(request);
    if (!user?.id || !user.email) {
      return jsonResponse({ error: "login_required" }, { status: 401 });
    }
    const deliveryEmail = body.email?.trim() ?? "";
    const accountRegion = body.region?.trim() ?? "";
    if (!EMAIL_PATTERN.test(deliveryEmail) || !accountRegion) {
      return jsonResponse({ error: "invalid_account_details" }, { status: 400 });
    }

    const orderNo = createOrderNumber();
    const accessToken = createAccessToken();
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.rpc("create_payment_order", {
      p_out_trade_no: orderNo,
      p_access_token_hash: hashAccessToken(accessToken),
      p_user_id: user.id,
      p_billing_mode: product.billingMode,
      p_duration_months: product.durationMonths,
      p_product_name: product.name,
      p_amount: product.amount,
      p_delivery_email: deliveryEmail,
      p_account_region: accountRegion || null,
    });
    if (error) {
      if (error.message.includes("OUT_OF_STOCK")) {
        return jsonResponse({ error: "out_of_stock" }, { status: 409 });
      }
      throw error;
    }

    const origin = getPublicOrigin(request);
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp =
      request.headers.get("cf-connecting-ip") ??
      forwardedFor?.split(",")[0].trim() ??
      "127.0.0.1";
    const device = /android|iphone|ipad|mobile/i.test(
      request.headers.get("user-agent") ?? "",
    )
      ? "mobile"
      : "pc";
    const checkout = await createProviderCheckout({
      orderNo,
      product,
      notifyUrl: new URL("/api/payments/epay/notify", origin).toString(),
      clientIp,
      device,
    });
    return jsonResponse({
      ...checkout,
      orderNo,
      accessToken,
    });
  } catch (error) {
    console.error("Failed to create payment order", error);
    return jsonResponse({ error: "payment_unavailable" }, { status: 503 });
  }
}
