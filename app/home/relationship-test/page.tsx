import { getPublishedStars } from "../../myfate-stars-server";
import CelebrityBrowser from "../celebrity-match/celebrity-browser";

export default async function RelationshipTestWorkspace() {
  const stars = await getPublishedStars();
  return (
    <div className="mf-workspace-content">
      <header className="mf-workspace-heading mf-workspace-heading-compact">
        <div>
          <p>选择一位想了解的人，通过 25 个关系情境，看看你更适合成为 TA 的谁。</p>
        </div>
      </header>
      <CelebrityBrowser stars={stars} basePath="/home/relationship-test" />
      <p className="mf-workspace-disclaimer">关系身份是娱乐化相处角色，不代表真实年龄、性别或亲属关系。</p>
    </div>
  );
}
