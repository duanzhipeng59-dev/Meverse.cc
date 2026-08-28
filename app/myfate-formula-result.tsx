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
  const correct = result.reviews.filter((review) => review.correct);
  const incorrect = result.reviews.filter((review) => !review.correct);
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

      {incorrect.length ? (
        <section className="mf-formula-review-section is-incorrect">
          <header><span>需要调准</span><h2>你容易误读 TA 的地方</h2><p>下面的“错”只代表这次回应没有落到 TA 更需要的位置。</p></header>
          <div className="mf-formula-review-list">
            {incorrect.map((review, index) => (
              <article key={review.questionId}>
                <div className="mf-formula-review-index"><span>{String(index + 1).padStart(2, "0")}</span>{review.riskItem ? <b>关键风险题</b> : <b>{review.testType}</b>}</div>
                <h3>{review.question}</h3>
                <div className="mf-formula-choice is-user"><small>你的选择</small><strong>{review.selectedOption}</strong><div className="mf-formula-explanation"><b>为什么会错位</b><p>{selectedExplanation(review)}</p></div></div>
                <div className="mf-formula-choice is-correct"><small>正确答案 · 更适合 TA 的回答</small><strong>{review.correctOption}</strong><div className="mf-formula-explanation"><b>为什么这是正确答案</b><p>{correctExplanation(review)}</p></div></div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {correct.length ? (
        <section className="mf-formula-review-section is-correct">
          <header><span>自然适配</span><h2>你真正懂 TA 的地方</h2><p>这些回应不只是好听，而是在具体关系场景里能被 TA 接收到。</p></header>
          <div className="mf-formula-review-list">
            {correct.map((review, index) => (
              <article key={review.questionId}>
                <div className="mf-formula-review-index"><span>{String(index + 1).padStart(2, "0")}</span>{review.riskItem ? <b>关键风险题</b> : <b>{review.testType}</b>}</div>
                <h3>{review.question}</h3>
                <div className="mf-formula-choice is-correct"><small>你的选择 · 正确答案</small><strong>{review.correctOption}</strong><div className="mf-formula-explanation"><b>为什么这是正确答案</b><p>{correctExplanation(review)}</p></div></div>
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
