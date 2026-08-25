import Link from "next/link";
import { relationshipDimensions } from "../../relationship-profile-data";

export default function RelationshipProfilePage() {
  return (
    <div className="mf-workspace-content mf-profile-intro">
      <header className="mf-workspace-heading">
        <div>
          <span className="mf-kicker">关系行为画像</span>
          <h1>看见你在关系里的自然反应</h1>
          <p>通过具体的相处情境，了解你如何确认安全感、表达情绪、面对冲突与建立亲密边界。</p>
        </div>
        <div className="mf-workspace-meta"><span>✦</span><strong>24 道行为情境</strong><small>约 5 分钟完成</small></div>
      </header>

      <section className="mf-profile-intro-card">
        <div className="mf-profile-intro-copy">
          <span>不是好坏判断，而是行为偏好</span>
          <h2>没有标准答案，选择最像你的反应</h2>
          <p>结果会形成一份六维关系画像，帮助你理解平常状态和压力状态下更容易采取的相处方式。</p>
          <Link className="mf-primary-button" href="/home/relationship-profile/test">开始测试 <span>→</span></Link>
        </div>
        <div className="mf-profile-dimension-preview">
          {Object.values(relationshipDimensions).map((dimension, index) => (
            <div key={dimension.label}><i>{String(index + 1).padStart(2, "0")}</i><span>{dimension.label}</span><small>{dimension.low} ↔ {dimension.high}</small></div>
          ))}
        </div>
      </section>
      <p className="mf-workspace-disclaimer">本测试用于自我观察与娱乐，不构成心理诊断或专业建议。</p>
    </div>
  );
}
