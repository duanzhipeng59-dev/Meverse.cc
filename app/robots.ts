import type { MetadataRoute } from "next";
import { SITE_URL } from "./site-url";

// 允许抓取公开内容(首页、人物列表、人物公开预览页);
// 私人路由(登录、个人中心、私人报告、合盘、API)不允许抓取。
// 这些私人路由未登录本就 302 跳登录页,robots 再兜一层。
// 注意:人物公开页 /home/relationship-test/{id} 不在拦截列表,保持可抓取。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/login",
          "/home/profile",
          "/home/reports",
          "/home/reading",
          "/home/personal-reading",
          "/home/dual-star-match",
          "/home/relationship-profile",
          "/home/celebrity-match",
          "/home/relationship-test/*/test",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
