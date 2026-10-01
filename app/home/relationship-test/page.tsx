import { getPublishedStars } from "../../myfate-stars-server";
import CelebrityBrowser from "../celebrity-match/celebrity-browser";

export default async function RelationshipTestWorkspace() {
  const stars = await getPublishedStars();
  return (
    <div className="mf-workspace-content">
      <CelebrityBrowser stars={stars} basePath="/home/relationship-test" />
      <p className="mf-workspace-disclaimer">分析基于八字（四柱、十神、大运），仅供文化娱乐。</p>
    </div>
  );
}
