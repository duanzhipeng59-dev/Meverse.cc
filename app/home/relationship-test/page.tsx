import type { Metadata } from "next";
import { getPublishedStarList } from "../../myfate-stars-server";
import CelebrityBrowser from "../celebrity-match/celebrity-browser";

// 公开的人物列表,变更频率低;ISR 每 5 分钟后台刷新。
export const revalidate = 300;

export const metadata: Metadata = {
  title: "明星生辰画像合集",
  description: "浏览全部公开人物档案：出生资料、八字日主与 AI 生辰画像解读，支持继续向 AI 命理师追问。",
  alternates: { canonical: "/home/relationship-test" },
  openGraph: {
    title: "明星生辰画像合集 · MeVerse",
    description: "浏览全部公开人物档案：出生资料、八字日主与 AI 生辰画像解读。",
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
