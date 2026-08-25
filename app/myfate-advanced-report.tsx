import type { ReactNode } from "react";
import type { Dimension, StarProfile } from "./myfate-data";
import { finalVerdict, type AnswerSnapshot, type FateInterpretation } from "./myfate-engine";

const fateTitles = {
  "绝对": "命中注定",
  "可能": "红颜祸水",
  "也许": "些许暧昧",
  "不太像": "缘分较浅",
  "不是": "平行时空",
} as const;

function relationshipSignalLabel(score: number) {
  if (score >= 82) return "高度同步";
  if (score >= 68) return "明显默契";
  if (score >= 55) return "仍需磨合";
  return "差异明显";
}

export default function MyfateAdvancedReport({
  star,
  score,
  questionCount,
  behaviorScores,
  interpretation,
  actions,
  disclaimer = "本测试仅用于娱，不构成现实关系预测。",
}: {
  star: StarProfile;
  score: number;
  questionCount: number;
  answers: AnswerSnapshot[];
  behaviorScores: Record<Dimension, number>;
  interpretation: FateInterpretation;
  userMbti?: string;
  isInterpreting?: boolean;
  actions?: ReactNode;
  disclaimer?: string;
}) {
  const verdict = finalVerdict(score);
  const evidenceScores = interpretation.relationshipScores;
  const visualEvidence = interpretation.visualEvidence;
  const visualDimensions = visualEvidence ? [
    { label: "初始吸引", score: visualEvidence.dimensions.initialAttraction },
    { label: "情绪连接", score: visualEvidence.dimensions.emotionalConnection },
    { label: "沟通默契", score: visualEvidence.dimensions.communicationHarmony },
    { label: "互补成长", score: visualEvidence.dimensions.mutualGrowth },
    { label: "长期稳定", score: visualEvidence.dimensions.longTermStability },
    { label: "宿命/烙印感", score: visualEvidence.dimensions.fateImprint },
    { label: "冲突消耗", score: visualEvidence.dimensions.conflictConsumption, negative: true },
  ] : [];
  const relationshipSignals = [
    {
      label: "心动引力",
      description: "关系底色与认知偏好共同形成的吸引强度",
      score: evidenceScores?.attraction ?? Math.round((behaviorScores.expression + behaviorScores.novelty) / 2),
      color: "#b64770",
    },
    {
      label: "情绪托举",
      description: "双方能否接住需要，并让理性与感受互相补位",
      score: evidenceScores?.support ?? behaviorScores.security,
      color: "#d27b70",
    },
    {
      label: "相处节奏",
      description: "计划、陪伴、独处和现实选择中的协作程度",
      score: evidenceScores?.daily ?? behaviorScores.independence,
      color: "#8d6193",
    },
    {
      label: "长期潜力",
      description: "关系底色能否承受差异，并沉淀成稳定配合",
      score: evidenceScores?.longTerm ?? behaviorScores.conflict,
      color: "#697b9d",
    },
  ];
  const relationshipStructureSignals = [
    {
      label: "情绪回应",
      description: "理解感受，也能回应彼此没有说出口的需要",
      score: behaviorScores.expression,
    },
    {
      label: "相处节奏",
      description: "协调亲密、独处以及生活变化带来的距离",
      score: Math.round((behaviorScores.independence + behaviorScores.novelty) / 2),
    },
    {
      label: "长期稳定",
      description: "面对不确定、冲突与现实选择时继续共建关系",
      score: Math.round((behaviorScores.security + behaviorScores.conflict) / 2),
    },
  ];
  const deepLenses = [
    interpretation.mbtiInsight ? {
      title: "认知与表达节奏",
      content: interpretation.mbtiInsight,
    } : null,
    interpretation.behaviorInsight ? {
      title: "压力下的自然反应",
      content: interpretation.behaviorInsight,
    } : null,
    interpretation.pillarInsight ? {
      title: "关系底色与相处张力",
      content: interpretation.pillarInsight,
    } : null,
  ].filter((lens): lens is NonNullable<typeof lens> => lens !== null);
  const relationshipReadings = [
    interpretation.coreAttraction ? { index: "01", title: "初始吸引", content: interpretation.coreAttraction } : null,
    interpretation.intimacyRhythm ? { index: "02", title: "情绪连接", content: interpretation.intimacyRhythm } : null,
    interpretation.mbtiInsight ? { index: "03", title: "沟通默契", content: interpretation.mbtiInsight } : null,
    interpretation.supportPattern ? { index: "04", title: "互补成长", content: interpretation.supportPattern } : null,
    interpretation.longTermPotential ? { index: "05", title: "长期稳定", content: interpretation.longTermPotential } : null,
    interpretation.pillarInsight ? { index: "06", title: "宿命/烙印感", content: interpretation.pillarInsight } : null,
    interpretation.conflictCycle ? { index: "07", title: "冲突消耗", content: interpretation.conflictCycle } : null,
  ].filter((reading): reading is NonNullable<typeof reading> => reading !== null);

  return (
    <div className="mf-final-result">
      <section className="mf-final-hero">
        <div className="mf-final-person">
          <div className="mf-final-avatar" role="img" aria-label={star.name} style={{ backgroundImage: `url("${star.portraitSrc}")` }} />
          <span>你与 <strong>{star.name}</strong> 的最终缘分报告</span>
        </div>
        <div className="mf-final-verdict-row">
          <div className="mf-fate-title">
            <small>你和 TA 的关系</small>
            <div className="mf-fate-answer">{fateTitles[verdict]}</div>
            <span>{verdict}正缘</span>
          </div>
          <div className="mf-final-score"><strong>{score}</strong><span>%</span><small>综合匹配度</small></div>
        </div>
        <p className="mf-final-lead">{interpretation.summary}</p>
      </section>

      {visualEvidence ? (
        <section className="mf-evidence-overview">
          <div className="mf-final-section-heading"><span>关系数据画像</span><h2>{visualEvidence.relationshipType}</h2><p>缘分深不等于一定适合，两个分数分别呈现关系影响与长期相处能力</p></div>
          <div className="mf-evidence-summary">
            <article><strong>{visualEvidence.fateDepthScore}<small>%</small></strong><span>缘分深度</span></article>
            <article><strong>{visualEvidence.longTermMatchScore}<small>%</small></strong><span>长期匹配</span></article>
            <article className="is-conflict"><strong>{visualEvidence.conflictConsumptionScore}<small>%</small></strong><span>冲突消耗</span></article>
          </div>
          <div className="mf-evidence-bars">
            {visualDimensions.map((item) => <article className={item.negative ? "is-negative" : undefined} key={item.label}><div><span>{item.label}</span><strong>{item.score}%</strong></div><i><b style={{ width: `${item.score}%` }} /></i></article>)}
          </div>
        </section>
      ) : null}

      <section className="mf-relationship-structure mf-core-dimensions">
        <div className="mf-final-section-heading">
          <span>{questionCount} </span>
          <h2>缘分结构</h2>
          <p>四个分数描绘关系的相处质感</p>
        </div>
        <div className="mf-relationship-signals">
          {relationshipSignals.map((signal) => (
            <article key={signal.label} style={{ "--signal-color": signal.color, "--signal-score": `${signal.score}%` } as React.CSSProperties}>
              <i><b><strong>{signal.score}</strong><span>%</span></b></i>
              <h3>{signal.label}</h3>
              <small>{relationshipSignalLabel(signal.score)}</small>
              <p>{signal.description}</p>
            </article>
          ))}
        </div>
      </section>

      {relationshipReadings.length ? (
        <section className="mf-deep-report-lenses mf-seven-readings">
          <div className="mf-final-section-heading"><span>七个关系板块</span><h2>从心动到长期，看清你们的关系轨迹</h2><p>分别呈现吸引、连接、成长与消耗会如何发生</p></div>
          <div className="mf-deep-lens-grid">
            {relationshipReadings.map((reading) => <article key={reading.title}><span>{reading.index}</span><h3>{reading.title}</h3><p>{reading.content}</p></article>)}
          </div>
        </section>
      ) : null}

      <section className="mf-final-dual">
        <article>
          <span>你们的关系天赋</span>
          <h2>最自然的靠近方式</h2>
          <p className="mf-insight-summary">{interpretation.attraction}</p>
        </article>
        <article>
          <span>需要共同练习</span>
          <h2>真正进入关系后的提醒</h2>
          <p className="mf-insight-summary">{interpretation.friction}</p>
        </article>
      </section>

      <section className="mf-relationship-structure mf-original-structure">
        <div className="mf-final-section-heading"><span>缘分结构</span><h2>你们的关系会在这三个方面被真正看见</h2></div>
        <div className="mf-structure-bars">
          {relationshipStructureSignals.map((signal) => (
            <article key={signal.label}>
              <div><span>{signal.label}</span><strong>{relationshipSignalLabel(signal.score)}</strong></div>
              <i><b style={{ width: `${signal.score}%` }} /></i>
              <p>{signal.description}</p>
            </article>
          ))}
        </div>
      </section>

      {deepLenses.length ? (
        <section className="mf-deep-report-lenses">
          <div className="mf-final-section-heading"><span>深层关系解码</span><h2>为什么会心动，又会在哪里卡住</h2><p>拆开看你们在不同关系场景里的相处动力</p></div>
          <div className="mf-deep-lens-grid">
            {deepLenses.map((lens) => (
              <article key={lens.title}>
                <h3>{lens.title}</h3><p>{lens.content}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {actions ? <div className="mf-result-actions">{actions}</div> : null}
      <p className="mf-disclaimer">{disclaimer}</p>
    </div>
  );
}
