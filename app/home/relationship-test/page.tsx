import { getPublishedStarList } from "../../myfate-stars-server";
import CelebrityBrowser from "../celebrity-match/celebrity-browser";

// 公开的人物列表,变更频率低;ISR 每 5 分钟后台刷新。
export const revalidate = 300;

export default async function RelationshipTestWorkspace() {
  const stars = await getPublishedStarList();
  return (
    <div className="mf-workspace-content">
      <CelebrityBrowser stars={stars} basePath="/home/relationship-test" />
    </div>
  );
}
