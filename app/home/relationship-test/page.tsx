import type { Metadata } from "next";
import { getPublishedStarList } from "../../myfate-stars-server";
import CelebrityBrowser from "../celebrity-match/celebrity-browser";

// 公开的人物列表,变更频率低;ISR 每 5 分钟后台刷新。
export const revalidate = 300;

export const metadata: Metadata = {
  title: "明星八字·生辰画像合集",
  description: "全部明星的八字命盘与生辰画像合集：出生资料、八字日主、性格天赋与感情运势解读，可测两人合盘，支持向 AI 命理师追问。",
  keywords: ["明星八字", "偶像八字", "明星星座", "明星命理", "生辰画像", "八字解读", "AI算命", "偶像命盘"],
  alternates: { canonical: "/home/relationship-test" },
  openGraph: {
    title: "明星八字·生辰画像合集 · MeVerse",
    description: "全部明星的八字命盘与生辰画像合集：出生资料、八字日主、性格与感情解读，可测合盘。",
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
