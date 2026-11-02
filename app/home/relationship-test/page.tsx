import type { Metadata } from "next";
import { getPublishedStarList } from "../../myfate-stars-server";
import CelebrityBrowser from "../celebrity-match/celebrity-browser";

// 公开的人物列表,变更频率低;ISR 每 5 分钟后台刷新。
export const revalidate = 300;

export const metadata: Metadata = {
  title: "明星生辰画像合集｜AI 八字命理解读",
  description: "浏览全部明星的 AI 生辰画像：八字日主、格局分析、事业财富、感情运势，支持向 AI 命理师继续追问。BTS、SEVENTEEN、Taylor Swift 等全球偶像的命理解读。",
  keywords: ["明星八字", "偶像八字", "明星星座", "明星命理", "生辰画像", "八字解读", "AI算命", "偶像命盘"],
  alternates: { canonical: "/home/relationship-test" },
  openGraph: {
    title: "明星生辰画像合集｜AI 八字命理解读 · MeVerse",
    description: "浏览全部明星的 AI 生辰画像：八字日主、格局分析、事业财富、感情运势。",
    url: "/home/relationship-test",
  },
};

export default async function RelationshipTestWorkspace() {
  const stars = await getPublishedStarList();
  return (
    <div className="mf-workspace-content">
      <CelebrityBrowser stars={stars} basePath="/home/relationship-test" />
    </div>
  );
}
