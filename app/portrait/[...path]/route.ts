import { NextResponse, type NextRequest } from "next/server";

// 肖像同源代理:把 Supabase Storage 的图片转换请求改走本站 /portrait/ 路径,
// 让 Cloudflare 边缘缓存它(直连 supabase.co 的网络路径对部分访客极慢,实测 2.4~3s/张)。
// 只允许自家 bucket 前缀,杜绝开放代理。

const ALLOWED_PREFIX = "celebrity-portraits/";
const ALLOWED_PARAMS = new Set(["width", "height", "resize", "quality", "format"]);
const IMMUTABLE = "public, max-age=31536000, immutable";

function supabaseOrigin() {
  const url = process.env.SUPABASE_URL;
  if (url && /^https:\/\//u.test(url)) return new URL(url).origin;
  return "https://jhsoksaxkpujbcludxyw.supabase.co";
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const objectPath = path.map(decodeURIComponent).join("/");
  if (!objectPath.startsWith(ALLOWED_PREFIX) || objectPath.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstream = new URL(`${supabaseOrigin()}/storage/v1/render/image/public/${objectPath}`);
  for (const [key, value] of request.nextUrl.searchParams) {
    if (ALLOWED_PARAMS.has(key)) upstream.searchParams.set(key, value);
  }

  // Cloudflare Workers 提供 caches.default;本地 Node 环境没有,退化为直接代理。
  const cache = (globalThis as unknown as { caches?: { default: Cache } }).caches?.default;
  if (cache) {
    const cached = await cache.match(request.url);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("x-portrait-cache", "hit");
      return new NextResponse(cached.body, { status: cached.status, headers });
    }
  }

  // 上游 8 秒超时:Supabase 卡死时快速失败,不让访客请求无限挂起。
  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream.toString(), {
      signal: AbortSignal.timeout(8000),
      cf: { cacheEverything: true, cacheTtl: 2678400, cacheTtlByStatus: { "200-299": 2678400, "404": 60 } },
    } as RequestInit);
  } catch {
    return new NextResponse("Upstream timeout", { status: 504 });
  }
  if (!upstreamResponse.ok) {
    return new NextResponse("Upstream unavailable", { status: 502 });
  }

  const headers = new Headers();
  headers.set("content-type", upstreamResponse.headers.get("content-type") ?? "image/webp");
  headers.set("cache-control", IMMUTABLE);
  headers.set("x-portrait-cache", "miss");
  const response = new NextResponse(upstreamResponse.body, { status: 200, headers });
  if (cache) {
    try {
      await cache.put(request.url, response.clone());
    } catch {
      // 缓存写入失败不影响本次返回
    }
  }
  return response;
}
