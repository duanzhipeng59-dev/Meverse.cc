import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CelebrityDetail from "../../../celebrity-detail";
import ReportDetailWorkspace from "../../reports/[id]/report-detail-workspace";
import { getPublishedStar, getPublishedStarList, getStarBaziBrief, getStarReportViewTypes, type StarListItem } from "../../../myfate-stars-server";
import { getOptionalPageUser, requirePageUser } from "../../../require-page-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "明星合盘" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

// "继续探索"按月轮换:窗口起点 = 绝对月份数×7 + 当前明星id散列,每月基本整批更换、不同明星起点不同,避免固定小圈互推。
function monthlyOthers<T extends { id: string }>(pool: T[], starId: string, count = 8): T[] {
  if (pool.length === 0) return [];
  const now = new Date();
  const monthIndex = now.getFullYear() * 12 + now.getMonth();
  const idHash = [...starId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const start = (monthIndex * 7 + idHash) % pool.length;
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => pool[(start + i) % pool.length]);
}

export default async function RelationshipTargetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 游客可浏览明星详情;登录门槛移到报告入口按钮(AI解读)
  if (UUID_PATTERN.test(id)) {
    await requirePageUser(`/home/relationship-test/${id}`);
    return <ReportDetailWorkspace reportId={id} section="relationship-test" />;
  }
  const [star, allStars] = await Promise.all([getPublishedStar(id), getPublishedStarList()]);
  if (!star) notFound();
  const [others, bazi, user] = await Promise.all([
    Promise.resolve(monthlyOthers(allStars.filter(item => item.id !== star.id), star.id)),
    getStarBaziBrief(id),
    getOptionalPageUser(`/home/relationship-test/${id}`),
  ]);
  const unlockedTypes = user ? await getStarReportViewTypes(user.id, id) : [];
  return <CelebrityDetail star={star} backHref="/home" workspace others={others} baziBrief={bazi.brief} baziHeadline={bazi.headline} unlockedReportTypes={unlockedTypes} />;
}
