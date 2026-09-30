import {
  acceptProviderPayment,
  callbackPayload,
  isSuccessfulPayment,
  verifyCallback,
} from "../server";
import { acceptCreditPayment, isCreditOrderNo } from "../credits/server";

async function handle(request: Request) {
  try {
    const params =
      request.method === "POST"
        ? new URLSearchParams(await request.text())
        : new URL(request.url).searchParams;
    const payload = callbackPayload(params);
    if (!verifyCallback(payload) || !isSuccessfulPayment(payload)) {
      return new Response("error", { status: 400 });
    }
    if (isCreditOrderNo(payload.out_trade_no ?? "")) {
      await acceptCreditPayment(payload);
    } else {
      await acceptProviderPayment(payload);
    }
    return new Response("success", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Payment notification failed", error);
    return new Response("error", { status: 400 });
  }
}

export const GET = handle;
export const POST = handle;
