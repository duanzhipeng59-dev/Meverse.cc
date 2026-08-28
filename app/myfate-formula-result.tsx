import Link from "next/link";
import type { StarProfile } from "./myfate-data";
import type { FormulaTestResult } from "./myfate-generated-test-types";

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
        <p>{result.verdict.summary}</p>
        <div className="mf-formula-facts">
          <div><strong>{result.correctCount}</strong><span>/ {result.total} 道适配回应</span></div>
          <div><strong>{result.riskWrongCount}</strong><span>/ 5 道风险题错位</span></div>
        </div>
        {result.riskWrongCount >= 3 ? <small className="mf-formula-cap-note">关键风险题错位达到 3 道，本次结果不会进入最高档。</small> : null}
      </section>

      {result.basis ? (
        <section className="mf-formula-global-basis">
          <p className="mf-formula-basis-summary">{result.basis.summary}</p>
          <div className="mf-formula-basis-grid">
            <article><span>MBTI 关系倾向</span><p>{result.basis.mbti}</p></article>
            <article><span>三柱辅助观察</span><p>{result.basis.threePillars}</p></article>
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
                  <div className="mf-formula-choice is-correct"><small>你的选择 · 正确答案</small><strong>{review.correctOption}</strong><div className="mf-formula-explanation"><b>为什么这是正确答案</b><p>{correctExplanation(review)}</p></div></div>
                ) : (
                  <>
                    <div className="mf-formula-choice is-user"><small>你的选择</small><strong>{review.selectedOption}</strong><div className="mf-formula-explanation"><b>为什么会错位</b><p>{selectedExplanation(review)}</p></div></div>
                    <div className="mf-formula-choice is-correct"><small>正确答案 · 更适合 TA 的回答</small><strong>{review.correctOption}</strong><div className="mf-formula-explanation"><b>为什么这是正确答案</b><p>{correctExplanation(review)}</p></div></div>
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
