import {
  acceptProviderPayment,
  callbackPayload,
  isSuccessfulPayment,
  verifyCallback,
} from "../server";

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
    await acceptProviderPayment(payload);
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
