import { getPublishedStars } from "../../myfate-stars-server";
import CelebrityBrowser from "../celebrity-match/celebrity-browser";

export default async function RelationshipTestWorkspace() {
  const stars = await getPublishedStars();
  return (
    <div className="mf-workspace-content">
      <header className="mf-workspace-heading mf-workspace-heading-compact">
        <div>
          <p>选择一位想了解的人，输入你的出生日期，直接查看双方三柱合盘分析。</p>
        </div>
      </header>
      <CelebrityBrowser stars={stars} basePath="/home/relationship-test" />
      <p className="mf-workspace-disclaimer">三柱合盘不含出生时辰，仅供传统文化娱乐与关系观察参考。</p>
    </div>
  );
}
