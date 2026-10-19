// 精校版双星报告渲染:命中 DUAL_OVERRIDES 的组合用这份组件渲染定稿文案,
// 结构=双人八字资料卡头部/总览/沟通冲突/双向影响/六个判断/未来节奏/最终建议。
import StarAskPanel from "../../../relationship-test/[id]/test/ask-panel";
import DualProfileCards, { type DualProfilePerson } from "../../dual-profile-cards";
import type { DualOverrideContent } from "../../../../myfate-dual-overrides";

export default function DualOverrideReport({ content, profiles, reportId }: {
  content: DualOverrideContent;
  profiles: [DualProfilePerson, DualProfilePerson];
  reportId: string;
}) {
  const rhythm = content.futureRhythm;
  const range = rhythm.timeRange;
  const hasRhythm = rhythm.supportivePeriods.length > 0 || rhythm.pressurePeriods.length > 0;
  const [personA, personB] = profiles;

  return (
    <>
      <DualProfileCards people={profiles} />

      <section className="mf-zr-card" id="d-overview">
        <div className="mf-zr-section-head"><span>01</span><div><h2>关系总览</h2><p>关系的核心底色、支撑与消耗点</p></div></div>
        <dl className="mf-dual-ov">
          <div><dt>关系的核心底色</dt><dd>{content.overview.coreTone}</dd></div>
          <div><dt>最有支撑力的地方</dt><dd>{content.overview.strongestSupport}</dd></div>
          <div><dt>最需要经营的地方</dt><dd>{content.overview.needsCare}</dd></div>
        </dl>
      </section>

      <section className="mf-zr-card" id="d-communication">
        <div className="mf-zr-section-head"><span>02</span><div><h2><em className="mf-dual-sec-mark" aria-hidden="true">✦</em>日常沟通与冲突</h2><p>内在反应、冲突场景与更有效的沟通方式</p></div></div>
        <b className="mf-dual-group-label">两人的内在沟通反应</b>
        <div className="mf-dual-persona">
          <article><b>{content.communication.himPattern.label}</b><p>{content.communication.himPattern.text}</p></article>
          <article><b>{content.communication.herPattern.label}</b><p>{content.communication.herPattern.text}</p></article>
        </div>
        <b className="mf-dual-group-label">容易起冲突的场景</b>
        <div className="mf-dual-scene"><p>{content.communication.conflictScenes}</p></div>
        <b className="mf-dual-group-label">更有效的沟通方式</b>
        <div className="mf-dual-advice">
          <article><b>{content.communication.himAdvice.label}</b><p>{content.communication.himAdvice.text}</p></article>
          <article><b>{content.communication.herAdvice.label}</b><p>{content.communication.herAdvice.text}</p></article>
        </div>
      </section>

      <section className="mf-zr-card" id="d-influence">
        <div className="mf-zr-section-head"><span>03</span><div><h2><em className="mf-dual-sec-mark" aria-hidden="true">✦</em>双向关系影响</h2><p>双向影响与贴近之后的相处感受</p></div></div>
        <dl className="mf-dual-ov">
          <div><dt>本人会怎样影响对方</dt><dd>{content.mutualInfluence.himOnHer}</dd></div>
          <div><dt>对方会怎样影响本人</dt><dd>{content.mutualInfluence.herOnHim}</dd></div>
          <div><dt>贴近之后的相处感受</dt><dd>{content.mutualInfluence.closeupFeel}</dd></div>
        </dl>
      </section>

      <section className="mf-zr-card" id="d-judgments">
        <div className="mf-zr-section-head"><span>04</span><div><h2><em className="mf-dual-sec-mark" aria-hidden="true">✦</em>关系里的六个关键判断</h2><p>滋养、稳定、边界、托底、张力与风险</p></div></div>
        <dl className="mf-dual-judge">
          {content.keyJudgments.map((item) => (
            <div key={item.question}><dt>{item.question}</dt><dd>{item.answer}</dd></div>
          ))}
        </dl>
      </section>

      {hasRhythm ? (
        <section className="mf-zr-card" id="d-timeline">
          <div className="mf-zr-section-head">
            <span>05</span>
            <div>
              <h2><em className="mf-dual-sec-mark" aria-hidden="true">✦</em>未来关系节奏</h2>
              <p>{range ? `双方可分析区间 ${range.startYear}–${range.endYear} · 由两人大运流年数据交集确定` : "双方大运流年窗口"}</p>
            </div>
          </div>
          <div className="mf-dual-rhythm">
            {([
              ["支持阶段", rhythm.supportivePeriods],
              ["压力阶段", rhythm.pressurePeriods],
            ] as const).map(([groupLabel, periods]) => periods.length > 0 ? (
              <div className={`mf-dual-rhythm-group${groupLabel === "压力阶段" ? " is-pressure" : ""}`} key={groupLabel}>
                <b>{groupLabel}</b>
                <div className="mf-dual-periods">
                  {periods.map((period) => (
                    <article className={`mf-dual-period${groupLabel === "压力阶段" ? " is-pressure" : ""}`} key={`${period.startYear}-${period.endYear}`}>
                      <span>{period.startYear === period.endYear ? `${period.startYear}` : `${period.startYear}–${period.endYear}`}</span>
                      <b>{period.label}</b>
                      <p>{period.detail}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null)}
          </div>
          <p className="mf-zr-chart-note">阶段由双方原局、各自大运与流年触发共同归纳,只描述趋势窗口,不预测现实事件。</p>
        </section>
      ) : null}

      <section className="mf-zr-card" id="d-advice">
        <div className="mf-zr-section-head"><span>{hasRhythm ? "06" : "05"}</span><div><h2><em className="mf-dual-sec-mark" aria-hidden="true">✦</em>最终建议</h2><p>相处方式、优先课题与压力应对原则</p></div></div>
        <dl className="mf-dual-ov">
          <div><dt>最值得保留的相处方式</dt><dd>{content.finalAdvice.keepWays}</dd></div>
          <div><dt>最该优先处理的问题</dt><dd>{content.finalAdvice.priorityFix}</dd></div>
        </dl>
        <b className="mf-dual-group-label">压力来时的处理原则</b>
        <div className="mf-dual-advice">
          <article><b>男方原则</b><p>{content.finalAdvice.pressureHim}</p></article>
          <article><b>女方原则</b><p>{content.finalAdvice.pressureHer}</p></article>
          <article><b>共同原则</b><p>{content.finalAdvice.pressureBoth}</p></article>
        </div>
      </section>

      <div id="d-ask">
        <StarAskPanel starId={reportId} starName={`${personA.name} × ${personB.name}`} suggestions={[
          "谁更容易先被对方吸引？",
          "两个人更适合合作还是建立亲密关系？",
          "这段关系最容易因为什么发生矛盾？",
        ]} reportType="dual" />
      </div>

      <p className="mf-zr-note">本报告基于公开出生资料与八字合盘规则生成,评分与结论由确定性引擎与 AI 解读共同产出,仅用于娱乐和自我探索,不代表当事人的现实关系或真实态度。</p>
    </>
  );
}
