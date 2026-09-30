import { getPublishedStars } from "../../myfate-stars-server";
import CelebrityBrowser from "../celebrity-match/celebrity-browser";

export default async function RelationshipTestWorkspace() {
  const stars = await getPublishedStars();
  return (
    <div className="mf-workspace-content">
      <header className="mf-workspace-heading mf-workspace-heading-compact">
        <div>
          <p>选择一位想了解的人，输入出生日期、时间与城市，直接生成吠陀合盘分析。</p>
        </div>
      </header>
      <CelebrityBrowser stars={stars} basePath="/home/relationship-test" />
      <p className="mf-workspace-disclaimer">合盘基于吠陀占星，仅供文化娱乐与关系观察参考。</p>
    </div>
  );
}
