import { getPublishedStars } from "../../myfate-stars-server";
import CelebrityBrowser from "../celebrity-match/celebrity-browser";

export default async function RelationshipTestWorkspace() {
  const stars = await getPublishedStars();
  return (
    <div className="mf-workspace-content">
      <CelebrityBrowser stars={stars} basePath="/home/relationship-test" />
      <p className="mf-workspace-disclaimer">合盘基于吠陀占星，仅供文化娱乐与关系观察参考。</p>
    </div>
  );
}
