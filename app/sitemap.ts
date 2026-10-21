import type { MetadataRoute } from "next";
import { SITE_URL } from "./site-url";
import { getPublishedStarList } from "./myfate-stars-server";

// 公开页面 sitemap:首页、人物列表、每位已发布人物的公开预览页。
// 私人页面(登录、个人中心、报告、合盘、API)一律不进 sitemap;
// 人物名单与列表页同源(Supabase + 静态快照兜底),ISR 每小时刷新。
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stars = await getPublishedStarList();
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/home/relationship-test`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...stars.map((star) => ({
      url: `${SITE_URL}/home/relationship-test/${star.id}`,
      lastModified: star.createdAt ? new Date(star.createdAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
