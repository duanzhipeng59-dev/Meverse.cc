import { NextResponse, type NextRequest } from "next/server";

// ── 应用层 WAF(与 Vercel/Cloudflare 入口防护互补)──────────────────────────
// 1. 探针路径拦截:扫描器常打的路径直接 403,不进业务、不耗配额、降低日志噪音
// 2. 攻击工具 UA 黑名单
// 3. /api/* 每 IP 速率限制(edge isolate 内存实现,Vercel 多实例下为近似值)
// 4. 基础安全响应头
// 5. CSRF:状态变更请求必须携带同源 Origin/Referer(EPay 回调靠网关验签,白名单放行)

const PROBE_PREFIXES = [
  "/wp-admin", "/wp-login.php", "/wp-content", "/xmlrpc.php",
  "/.env", "/.git", "/.config", "/.aws", "/.ssh", "/.ds_store",
  "/phpmyadmin", "/pma/", "/mysql/", "/adminer",
  "/vendor/phpunit", "/eval-stdin", "/vendor/laravel",
  "/config.php", "/config.json", "/configuration.php",
  "/actuator", "/console", "/shell", "/owa/", "/autodiscover",
  "/backup.sql", "/dump.sql", "/db.sql", "/database.sql",
];

const ATTACK_UA = /(sqlmap|nikto|nuclei|masscan|zgrab|dirbuster|gobuster|wpscan|havij|acunetix|netsparker)/i;

const CALLBACK_ALLOWLIST = ["/api/payments/epay/notify"];

// 速率限制:60 秒窗口内每 IP 最多 300 次 API 调用(正常浏览+轮询远低于此)
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 300;
const RATE_MAX_KEYS = 50_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function ipFrom(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? "").trim() || "unknown";
}

function rateLimited(ip: string) {
  const now = Date.now();
  if (rateBuckets.size > RATE_MAX_KEYS) {
    for (const [key, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(key);
    }
    if (rateBuckets.size > RATE_MAX_KEYS) rateBuckets.clear();
  }
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX;
}

function blocked(status: number, code: string) {
  return NextResponse.json({ error: code }, { status });
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("x-frame-options", "DENY");
  return response;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. 探针路径(大小写不敏感)
  const lower = pathname.toLowerCase();
  if (PROBE_PREFIXES.some((prefix) => lower === prefix || lower.startsWith(prefix.endsWith("/") ? prefix : prefix + "/") || lower.startsWith(prefix + "?"))) {
    console.warn("Blocked probe path", { pathname, ip: ipFrom(request) });
    return blocked(403, "forbidden");
  }

  // 2. 攻击工具 UA
  const userAgent = request.headers.get("user-agent") ?? "";
  if (ATTACK_UA.test(userAgent)) {
    console.warn("Blocked attack tool UA", { userAgent: userAgent.slice(0, 60), ip: ipFrom(request) });
    return blocked(403, "forbidden");
  }

  const method = request.method.toUpperCase();

  // 3. API 速率限制(页面浏览不限)
  if (pathname.startsWith("/api/") && method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const ip = ipFrom(request);
    if (rateLimited(ip)) {
      console.warn("Rate limited", { ip, pathname });
      const response = blocked(429, "rate_limited");
      response.headers.set("retry-after", "60");
      return response;
    }
  }

  // 4. CSRF:状态变更请求必须同源(浏览器同源 fetch/表单必带 Origin)
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    if (!CALLBACK_ALLOWLIST.some((path) => pathname === path)) {
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
        return blocked(403, "cross_origin_blocked");
      }
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|historical-figure.svg).*)"],
};
