import { NextResponse, type NextRequest } from "next/server";

// 防 CSRF:浏览器发起的状态变更请求(POST/PUT/DELETE/PATCH)必须携带同源 Origin 或 Referer。
// 跨站攻击请求的 Origin 属于攻击者站点,与目标 host 不一致,直接 403。
// EPay 支付回调是服务器间调用(无 Origin 头),凭网关 MD5 验签放行。
const CALLBACK_ALLOWLIST = ["/api/payments/epay/notify"];

export function middleware(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return NextResponse.next();
  }
  const pathname = request.nextUrl.pathname;
  if (CALLBACK_ALLOWLIST.some((path) => pathname === path)) {
    return NextResponse.next();
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const candidates = [request.headers.get("origin"), request.headers.get("referer")].filter(
    (value): value is string => Boolean(value),
  );
  const sameOrigin = host
    ? candidates.some((value) => {
        try {
          return new URL(value).host === host;
        } catch {
          return false;
        }
      })
    : false;
  if (!sameOrigin) {
    console.warn("Blocked cross-origin mutation", { pathname, method, origin: candidates[0] ?? null });
    return NextResponse.json({ error: "cross_origin_blocked" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
