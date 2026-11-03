import type { NextConfig } from "next";

// 首页加载提速的缓存策略(生产 Vercel):
// 1. 带版本参数的静态资源一律 immutable 一年——URL 里的 ?v= 变了浏览器必然重新拉取,
//    所以长缓存不会导致"改了资源用户看到旧图"(route-css 的 v 是 mtime 自动生成,
//    logo/favicon 的 v 在替换文件时手动 +1)。
// 2. 无版本参数的公共图片(og 图、本地肖像覆盖图、兜底 svg)只缓存 1 天:
//    它们可能被替换而不改文件名,不能锁死一年。
// 3. portrait 同源代理在 app/portrait/[...path]/route.ts 里自设 immutable,不走这里。
// 注:vinext(Cloudflare 管线)不读取 headers(),该配置只影响 Vercel 生产。
const IMMUTABLE = "public, max-age=31536000, immutable";

const nextConfig: NextConfig = {
  experimental: {
    // 动态页(工作台/合盘等 force-dynamic 页面)的客户端路由缓存恢复 30 秒:
    // 返回导航瞬时显示,避免每次进入都白屏等服务端重跑查询;router.refresh() 仍即时重取。
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [
      // 手改直发的路由级样式:href 自带 mtime 版本参数(route-css-version.ts),可永久缓存
      {
        source: "/route-css/:path*",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
      // 首页版本化图片:替换文件时更新引用里的 ?v=
      {
        source: "/hero-scroll.webp",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
      {
        source: "/myfate-logo.webp",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
      {
        source: "/meverse-logo-round.webp",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
      {
        source: "/favicon.png",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
      {
        source: "/favicon-180.png",
        headers: [{ key: "Cache-Control", value: IMMUTABLE }],
      },
      // 无版本参数的公共图片:短缓存,替换后一天内全网生效
      {
        source: "/og-meverse.jpg",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/celebrity-portraits/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
