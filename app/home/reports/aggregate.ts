// 浏览记录聚合与文案:纯函数,服务端页面与客户端筛选组件共用。
import type { StarReportType, StarReportView } from "../../myfate-stars-server";

export type ReportFilter = "all" | "bazi" | "astrology" | "dual";

export const REPORT_LABELS: Record<StarReportType, string> = {
  bazi: "AI 生辰画像",
  astrology: "AI 星盘解读",
};

export const FILTERS: Array<{ id: ReportFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "bazi", label: "生辰画像" },
  { id: "astrology", label: "星盘解读" },
  { id: "dual", label: "双星合盘" },
];

export const EMPTY_COPY: Record<ReportFilter, { title: string; hint: string }> = {
  all: { title: "还没有浏览记录", hint: "去明星解读打开一份报告，它会自动出现在这里。" },
  bazi: { title: "还没有浏览过生辰画像", hint: "在明星详情页打开「AI 生辰解读」，记录会出现在这里。" },
  astrology: { title: "还没有浏览过星盘解读", hint: "在明星详情页打开「AI 星盘解读」，记录会出现在这里。" },
  dual: { title: "还没有生成过双星合盘", hint: "在「双星合盘」选择两位明星生成报告，记录会出现在这里。" },
};

export type StarGroup = {
  starId: string;
  name: string;
  role: string;
  portraitSrc: string;
  entries: Array<{ type: StarReportType; viewCount: number; askCount: number; lastViewedAt: string }>;
  latestAt: string;
};

// 按明星聚合;组内报告行按最近时间排序,组间按最新浏览排序
export function aggregateGroups(views: StarReportView[]): StarGroup[] {
  const groups = new Map<string, StarGroup>();
  for (const view of views) {
    let group = groups.get(view.starId);
    if (!group) {
      group = { starId: view.starId, name: view.name, role: view.role, portraitSrc: view.portraitSrc, entries: [], latestAt: view.lastViewedAt };
      groups.set(view.starId, group);
    }
    group.entries.push({ type: view.reportType, viewCount: view.viewCount, askCount: view.askCount, lastViewedAt: view.lastViewedAt });
    if (view.lastViewedAt > group.latestAt) group.latestAt = view.lastViewedAt;
  }
  return [...groups.values()]
    .map((group) => ({ ...group, entries: group.entries.sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt)) }))
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

export function filterGroups(groups: StarGroup[], filter: ReportFilter): StarGroup[] {
  if (filter === "all") return groups;
  return groups
    .map((group) => ({ ...group, entries: group.entries.filter((entry) => entry.type === filter) }))
    .filter((group) => group.entries.length > 0);
}

export function entryAskText(askCount: number) {
  return askCount > 0 ? `已追问${askCount}次` : "暂无追问";
}

export function relativeTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 1) return "昨天";
  if (diffDays < 30) return `${diffDays}天前`;
  return date.getFullYear() === now.getFullYear()
    ? date.toLocaleDateString("zh-CN", { month: "long", day: "numeric" })
    : date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}
