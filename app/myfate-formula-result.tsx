import Link from "next/link";
import type { StarProfile } from "./myfate-data";
import type { FormulaTestResult } from "./myfate-generated-test-types";

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
                <div className="mf-formula-choice is-user"><small>你的选择</small><strong>{review.selectedOption}</strong><p>{review.selectedExplanation}</p></div>
                <div className="mf-formula-choice is-correct"><small>更适合 TA 的回答</small><strong>{review.correctOption}</strong><p>{review.correctExplanation}</p></div>
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
                <div className="mf-formula-choice is-correct"><small>你的正确选择</small><strong>{review.correctOption}</strong><p>{review.correctExplanation}</p></div>
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
