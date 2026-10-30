import {
  acceptProviderPayment,
  callbackPayload,
  getPublicOrigin,
  isSuccessfulPayment,
  verifyCallback,
} from "../server";
import { acceptCreditPayment, isCreditOrderNo } from "../credits/server";

// 浏览器支付回跳:验签通过则尝试履约(RC 积分单与 WG 订阅单都处理;notify 是权威履约入口,
// 这里只是兜底),然后送回解读页(旧 /subscribe 页已下线)。
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const orderNo = requestUrl.searchParams.get("order") ?? "";
  const payload = callbackPayload(requestUrl.searchParams);
  delete payload.order;
  delete payload.token;

  if (payload.sign && verifyCallback(payload) && isSuccessfulPayment(payload)) {
    try {
      if (isCreditOrderNo(payload.out_trade_no ?? "")) {
        await acceptCreditPayment(payload);
      } else {
        await acceptProviderPayment(payload);
      }
    } catch (error) {
      console.error("Payment return confirmation failed", error);
    }
  }

  const redirectUrl = new URL("/home/dual-star-match", getPublicOrigin(request));
  redirectUrl.searchParams.set("paid", orderNo || payload.out_trade_no || "");
  return Response.redirect(redirectUrl, 303);
}
