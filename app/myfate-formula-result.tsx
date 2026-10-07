import Link from "next/link";
import type { StarProfile } from "./myfate-data";
import type {
  FormulaReview,
  FormulaTestResult,
  LegacyFormulaTestResult,
  RelationshipIdentityResult,
  ThreePillarCompositeResult,
} from "./myfate-generated-test-types";

type HighlightTone = "neutral" | "positive" | "attention";

const emphasisKeywords: Record<HighlightTone, RegExp> = {
  neutral: /核心|关键|需要|更在意|观察|关系|回应|边界|沟通|情绪|长期|身份|陪伴/u,
  positive: /能够|满足|接住|理解|尊重|信任|稳定|有利|自然|共鸣|支持/u,
  attention: /缺少|忽略|错位|触发|防御|消耗|压力|误解|建议|调整|拉扯/u,
};

function HighlightedCopy({ text, tone = "neutral" }: { text: string; tone?: HighlightTone }) {
  const parts = text.split(/([，。；！？：])/u);
  let highlightIndex = -1;
  let bestScore = -1;
  for (let index = 0; index < parts.length; index += 2) {
    const part = parts[index]?.trim();
    if (!part || part.length < 4) continue;
    const score = (emphasisKeywords[tone].test(part) ? 5 : 0)
      + (emphasisKeywords.neutral.test(part) ? 2 : 0)
      + (part.length >= 8 && part.length <= 32 ? 2 : 0);
    if (score > bestScore) {
      bestScore = score;
      highlightIndex = index;
    }
  }
  return <>{parts.map((part, index) => index === highlightIndex
    ? <mark className={`mf-key-point is-${tone}`} key={`${part}-${index}`}>{part}</mark>
    : part)}</>;
}

function ThreePillarCompositeView({
  star,
  result,
  actions,
}: {
  star: Pick<StarProfile, "id" | "name" | "portraitSrc">;
  result: ThreePillarCompositeResult;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mf-formula-result mf-composite-result">
      <section className="mf-formula-verdict is-relationship-identity">
        <span>MYFATE · 合盘分析</span>
        <div className="mf-formula-verdict-person"><i style={{ backgroundImage: `url("${star.portraitSrc}")` }} /><small>你与 {star.name}</small></div>
        <p className="mf-identity-lead">合盘关系主轴</p>
        <h1>{result.headline}</h1>
        <p><HighlightedCopy text={result.insight} tone="positive" /></p>
        <div className="mf-formula-facts"><div><strong>合盘分析</strong><small>年 · 月 · 日</small></div><div><strong>不含时柱</strong><small>不补算出生时辰</small></div></div>
      </section>

      <section className="mf-identity-ranking" aria-labelledby="mf-composite-dimensions-title">
        <div className="mf-identity-section-heading"><span>合盘结构</span><h2 id="mf-composite-dimensions-title">四个关系维度</h2><p>用于观察双方的互动方式，不进行分数、排名或好坏判定。</p></div>
        <div className="mf-identity-ranking-grid">{result.dimensions.map((dimension) => <article key={dimension.label}><div><span>✦</span><small>{dimension.tendency}</small></div><h3>{dimension.label}</h3><p>{dimension.description}</p><footer>{dimension.tendency}</footer></article>)}</div>
      </section>

      <section className="mf-formula-global-basis">
        <p className="mf-formula-basis-summary"><HighlightedCopy text={result.tension} tone="attention" /></p>
        <div className="mf-formula-basis-grid"><article><span>你的三柱</span><p>{result.userThreePillars}</p></article><article><span>{star.name} 的三柱</span><p>{result.starThreePillars}</p></article></div>
        <p className="mf-report-generation-note">本分析只使用年、月、日三柱，不含时柱，仅供传统文化娱乐与关系观察参考，不构成现实关系预测。</p>
      </section>
      <div className="mf-result-actions">{actions ?? <Link className="mf-secondary-button" href="/home/reports">返回浏览记录</Link>}</div>
    </div>
  );
}

function RelationshipIdentityView({
  star,
  result,
  actions,
}: {
  star: Pick<StarProfile, "id" | "name" | "portraitSrc">;
  result: RelationshipIdentityResult;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mf-formula-result mf-relationship-identity-result">
      <section className="mf-formula-verdict is-relationship-identity">
        <span>MYFATE · 关系身份测试</span>
        <div className="mf-formula-verdict-person">
          <i style={{ backgroundImage: `url("${star.portraitSrc}")` }} />
          <small>你在 {star.name} 身边更自然的位置</small>
        </div>
        <p className="mf-identity-lead">你更适合成为 TA 的</p>
        <h1>{result.primaryRole.label}</h1>
        <p><HighlightedCopy text={result.primaryRole.summary} tone="positive" /></p>
        <div className="mf-formula-facts">
          <div><strong>{result.total} 个情境</strong></div>
          <div><strong>16 种关系身份</strong></div>
        </div>
        <small className="mf-identity-symbolic-note">身份名称代表相处角色，不代表真实年龄、性别或亲属关系。</small>
      </section>

      <section className="mf-identity-ranking" aria-labelledby="mf-identity-ranking-title">
        <div className="mf-identity-section-heading">
          <span>关系身份图谱</span>
          <h2 id="mf-identity-ranking-title">你最自然的三个位置</h2>
          <p>不是关系好坏排名，而是你的不同相处本能。</p>
        </div>
        <div className="mf-identity-ranking-grid">
          {result.roleRanking.map((role, index) => (
            <article className={index === 0 ? "is-primary" : ""} key={role.id}>
              <div><span>0{index + 1}</span><small>{role.category}</small></div>
              <h3>{role.label}</h3>
              <p>{role.summary}</p>
              <footer>{role.score} 点关系信号</footer>
            </article>
          ))}
        </div>
      </section>

      <section className="mf-formula-global-basis">
        <p className="mf-formula-basis-summary"><HighlightedCopy text={result.basis.summary} /></p>
        <div className="mf-formula-basis-grid">
          <article><span>MBTI 关系倾向</span><p><HighlightedCopy text={result.basis.mbti} /></p></article>
          <article><span>三柱辅助观察</span><p><HighlightedCopy text={result.basis.threePillars} /></p></article>
        </div>
        <div className="mf-formula-basis-concerns"><span>本次主要观察</span><div>{result.basis.observationFocus.map((focus) => <b key={focus}>{focus}</b>)}</div></div>
      </section>

      <section className="mf-formula-review-section is-sequential">
        <div className="mf-formula-review-list">
          {result.reviews.map((review, index) => (
            <article className="is-identity" key={review.questionId}>
              <div className="mf-formula-review-index"><span>{String(index + 1).padStart(2, "0")}</span><b>{review.testType}</b></div>
              <h3>{review.question}</h3>
              <div className="mf-formula-choice is-user">
                <small>你的选择</small>
                <strong>{review.selectedOption}</strong>
                <div className="mf-identity-choice-roles">
                  <span>{review.primaryRole.shortLabel}</span>
                  <span>＋ {review.secondaryRole.shortLabel}</span>
                </div>
                <div className="mf-formula-explanation"><p><HighlightedCopy text={review.explanation} tone="neutral" /></p></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="mf-result-actions">
        {actions ?? <Link className="mf-secondary-button" href="/home/reports">返回浏览记录</Link>}
      </div>
    </div>
  );
}

function fallbackCorrectExplanation(testType: string) {
  if (testType === "脆弱点承接") return "这个回应会先接住 TA 当下的感受，同时保留必要边界，更不容易触发防御。";
  if (testType === "长期磨合") return "这个回应兼顾了双方的现实需要、个人边界与后续沟通。";
  return "这个回应能够更直接地看见并满足 TA 在当前情境中的核心情感需求。";
}

function correctExplanation(review: FormulaReview) {
  return review.correctExplanation?.trim() || fallbackCorrectExplanation(review.testType);
}

function selectedExplanation(review: FormulaReview) {
  return review.selectedExplanation?.trim() || "这个回应虽然可能出于好意，但没有优先处理 TA 在当前情境中的核心需要。";
}

function LegacyResultView({
  star,
  result,
  actions,
}: {
  star: Pick<StarProfile, "id" | "name" | "portraitSrc">;
  result: LegacyFormulaTestResult;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mf-formula-result">
      <section className={`mf-formula-verdict is-${result.verdict.key}`}>
        <span>MYFATE · 历史正缘判定</span>
        <div className="mf-formula-verdict-person"><i style={{ backgroundImage: `url("${star.portraitSrc}")` }} /><small>你与 {star.name}</small></div>
        <h1>{result.verdict.title}</h1>
        <p><HighlightedCopy text={result.verdict.summary} /></p>
        <div className="mf-formula-facts"><div><strong>一共 {result.total} 题</strong></div><div><strong>答对 {result.correctCount} 题</strong></div></div>
      </section>
      {result.basis ? <section className="mf-formula-global-basis">
        <p className="mf-formula-basis-summary"><HighlightedCopy text={result.basis.summary} /></p>
        <div className="mf-formula-basis-grid"><article><span>MBTI 关系倾向</span><p>{result.basis.mbti}</p></article><article><span>三柱辅助观察</span><p>{result.basis.threePillars}</p></article></div>
        <div className="mf-formula-basis-concerns"><span>TA 更在意</span><div>{result.basis.coreConcerns.map((concern) => <b key={concern}>{concern}</b>)}</div></div>
      </section> : null}
      <section className="mf-formula-review-section is-sequential"><div className="mf-formula-review-list">
        {result.reviews.map((review, index) => <article className={review.correct ? "is-correct" : "is-incorrect"} key={review.questionId}>
          <div className="mf-formula-review-index"><span>{String(index + 1).padStart(2, "0")}</span><b>{review.riskItem ? "关键风险题" : review.testType}</b></div>
          <h3>{review.question}</h3>
          {review.correct ? <div className="mf-formula-choice is-correct"><small>你的选择 · 正确答案</small><strong>{review.correctOption}</strong><div className="mf-formula-explanation"><p>{correctExplanation(review)}</p></div></div> : <><div className="mf-formula-choice is-user"><small>你的选择</small><strong>{review.selectedOption}</strong><div className="mf-formula-explanation"><p>{selectedExplanation(review)}</p></div></div><div className="mf-formula-choice is-correct"><small>历史测试参考答案</small><strong>{review.correctOption}</strong><div className="mf-formula-explanation"><p>{correctExplanation(review)}</p></div></div></>}
        </article>)}
      </div></section>
      <div className="mf-result-actions">{actions}</div>
    </div>
  );
}

export default function MyfateFormulaResult({
  star,
  result,
  actions,
}: {
  star: Pick<StarProfile, "id" | "name" | "portraitSrc">;
  result: FormulaTestResult;
  actions?: React.ReactNode;
}) {
  if (result.version === 3) return <ThreePillarCompositeView star={star} result={result} actions={actions} />;
  return result.version === 2
    ? <RelationshipIdentityView star={star} result={result} actions={actions} />
    : <LegacyResultView star={star} result={result} actions={actions} />;
}
