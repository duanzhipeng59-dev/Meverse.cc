import Link from "next/link";
import type { StarProfile } from "./myfate-data";
import type { FormulaTestResult } from "./myfate-generated-test-types";

type HighlightTone = "neutral" | "positive" | "attention";

const emphasisKeywords: Record<HighlightTone, RegExp> = {
  neutral: /核心|关键|需要|更在意|观察|关系|回应|边界|沟通|情绪|长期/u,
  positive: /能够|满足|接住|理解|尊重|信任|稳定|有利|正向|更容易|良性/u,
  attention: /缺少|忽略|错位|触发|防御|消耗|压力|误解|建议|需要调整|不容易/u,
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
      + (part.length >= 8 && part.length <= 32 ? 2 : 0)
      - (/^(这个回应|这种回应|看似|虽然)/u.test(part) ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      highlightIndex = index;
    }
  }
  return <>{parts.map((part, index) => index === highlightIndex
    ? <mark className={`mf-key-point is-${tone}`} key={`${part}-${index}`}>{part}</mark>
    : part)}</>;
}

function fallbackCorrectExplanation(testType: string) {
  if (testType === "脆弱点承接") return "这个回应会先接住 TA 当下的感受，同时保留必要边界，更不容易触发防御或让关系进入相互消耗。";
  if (testType === "长期磨合") return "这个回应兼顾了双方的现实需要、个人边界与后续沟通，更有利于关系形成稳定、可持续的良性循环。";
  return "这个回应能够更直接地看见并满足 TA 在当前情境中的核心情感需求，因此更容易被 TA 真正接收到。";
}

function correctExplanation(review: FormulaTestResult["reviews"][number]) {
  return review.correctExplanation?.trim() || fallbackCorrectExplanation(review.testType);
}

function selectedExplanation(review: FormulaTestResult["reviews"][number]) {
  return review.selectedExplanation?.trim() || "这个回应虽然可能出于好意，但没有优先处理 TA 在当前情境中的核心需要，容易造成情绪、边界或沟通方式上的错位。";
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
  return (
    <div className="mf-formula-result">
      <section className={`mf-formula-verdict is-${result.verdict.key}`}>
        <span>MYFATE · 正缘判定</span>
        <div className="mf-formula-verdict-person">
          <i style={{ backgroundImage: `url("${star.portraitSrc}")` }} />
          <small>你与 {star.name}</small>
        </div>
        <h1>{result.verdict.title}</h1>
        <p><HighlightedCopy text={result.verdict.summary} /></p>
        <div className="mf-formula-facts">
          <div><strong>一共 {result.total} 题</strong></div>
          <div><strong>答对 {result.correctCount} 题</strong></div>
        </div>
      </section>

      {result.basis ? (
        <section className="mf-formula-global-basis">
          <p className="mf-formula-basis-summary"><HighlightedCopy text={result.basis.summary} /></p>
          <div className="mf-formula-basis-grid">
            <article><span>MBTI 关系倾向</span><p><HighlightedCopy text={result.basis.mbti} /></p></article>
            <article><span>三柱辅助观察</span><p><HighlightedCopy text={result.basis.threePillars} /></p></article>
          </div>
          <div className="mf-formula-basis-concerns"><span>TA 更在意</span><div>{result.basis.coreConcerns.map((concern) => <b key={concern}>{concern}</b>)}</div></div>
        </section>
      ) : null}

      {result.reviews.length ? (
        <section className="mf-formula-review-section is-sequential">
          <div className="mf-formula-review-list">
            {result.reviews.map((review, index) => (
              <article className={review.correct ? "is-correct" : "is-incorrect"} key={review.questionId}>
                <div className="mf-formula-review-index"><span>{String(index + 1).padStart(2, "0")}</span>{review.riskItem ? <b>关键风险题</b> : <b>{review.testType}</b>}</div>
                <h3>{review.question}</h3>
                {review.correct ? (
                  <div className="mf-formula-choice is-correct"><small>你的选择 · 正确答案</small><strong>{review.correctOption}</strong><div className="mf-formula-explanation"><p><HighlightedCopy text={correctExplanation(review)} tone="positive" /></p></div></div>
                ) : (
                  <>
                    <div className="mf-formula-choice is-user"><small>你的选择</small><strong>{review.selectedOption}</strong><div className="mf-formula-explanation"><p><HighlightedCopy text={selectedExplanation(review)} tone="attention" /></p></div></div>
                    <div className="mf-formula-choice is-correct"><small>正确答案 · 更适合 TA 的回答</small><strong>{review.correctOption}</strong><div className="mf-formula-explanation"><p><HighlightedCopy text={correctExplanation(review)} tone="positive" /></p></div></div>
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mf-result-actions">
        {actions ?? <Link className="mf-secondary-button" href="/home/celebrity-match">返回明星工作台</Link>}
      </div>
    </div>
  );
}
