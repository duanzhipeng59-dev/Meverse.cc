import {
  acceptProviderPayment,
  callbackPayload,
  getPublicOrigin,
  isSuccessfulPayment,
  verifyCallback,
} from "../server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const orderNo = requestUrl.searchParams.get("order") ?? "";
  const accessToken = requestUrl.searchParams.get("token") ?? "";
  const payload = callbackPayload(requestUrl.searchParams);
  delete payload.order;
  delete payload.token;

  if (payload.sign && verifyCallback(payload) && isSuccessfulPayment(payload)) {
    try {
      await acceptProviderPayment(payload);
    } catch (error) {
      console.error("Payment return confirmation failed", error);
    }
  }

  const redirectUrl = new URL("/subscribe", getPublicOrigin(request));
  redirectUrl.searchParams.set("payment_order", orderNo || payload.out_trade_no || "");
  redirectUrl.searchParams.set("payment_token", accessToken);
  return Response.redirect(redirectUrl, 303);
}
