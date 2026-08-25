"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth-context";
import { createInitialQuestions, type Dimension, type StarProfile, type TestQuestion } from "./myfate-data";
import {
  dimensionScores,
  initialVerdict,
  scoreAnswers,
  type AnswerSnapshot,
  type FateInterpretation,
} from "./myfate-engine";
import MyfateAdvancedReport from "./myfate-advanced-report";
import { createSavedReport, updateSavedReport } from "./myfate-report-storage";
import {
  calculateProgressiveCompatibility,
  emptyProgressiveProfile,
  readBasicProfile,
  readProgressiveProfile,
  recordProgressiveTest,
  selectProgressiveQuestions,
  type ProgressiveProfile,
} from "./myfate-progressive-profile";

type Stage = "initial-test" | "initial-result" | "final";

const positiveSignals: Record<Dimension, string> = {
  security: "你愿意在不确定里给 TA 稳定回应",
  expression: "你能看见 TA 没有说出口的情绪",
  independence: "你愿意尊重 TA 的节奏与个人空间",
  conflict: "你倾向理解分歧，而不是争输赢",
  novelty: "你愿意和 TA 一起进入新的体验",
};

const growingSignals: Record<Dimension, string> = {
  security: "面对距离时，安全感仍需要确认",
  expression: "重要感受可以再表达得清楚一点",
  independence: "靠近 TA 时，也要保留彼此的空间",
  conflict: "分歧出现时，别让沉默代替沟通",
  novelty: "生活节奏不同，需要一起找到平衡",
};

function answerSnapshots(questions: TestQuestion[], answers: Record<string, number>): AnswerSnapshot[] {
  return questions.flatMap((question) => {
    const value = answers[question.id];
    const option = question.options.find((candidate) => candidate.value === value);
    return option ? [{ question: question.question, answer: option.label, value, dimension: question.dimension }] : [];
  });
}

type PersonalizationResponse = {
  interpretation?: FateInterpretation;
  source?: "deepseek" | "gemini";
};

async function personalize(body: Record<string, unknown>): Promise<PersonalizationResponse> {
  const response = await fetch("/api/myfate/personalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("PERSONALIZATION_FAILED");
  return response.json() as Promise<PersonalizationResponse>;
}

export default function MyfateTest({ star, workspace = false }: { star: StarProfile; workspace?: boolean }) {
  const { status, email } = useAuth();
  const allQuestions = useMemo(() => createInitialQuestions(star), [star]);
  const [initialQuestions, setInitialQuestions] = useState(allQuestions);
  const [progressiveProfile, setProgressiveProfile] = useState<ProgressiveProfile>(() => emptyProgressiveProfile());
  const [userMbti, setUserMbti] = useState("");
  const [userBirthDate, setUserBirthDate] = useState("");
  const [stage, setStage] = useState<Stage>("initial-test");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [initialAnswers, setInitialAnswers] = useState<Record<string, number>>({});
  const [interpretation, setInterpretation] = useState<FateInterpretation | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerationError, setReportGenerationError] = useState("");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null);
  const [calculatedDimensions, setCalculatedDimensions] = useState<Record<Dimension, number> | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const storedProfile = readProgressiveProfile(email);
      setProgressiveProfile(storedProfile);
      const basicProfile = readBasicProfile(email);
      setUserMbti(basicProfile.mbti);
      setUserBirthDate(basicProfile.birthDate);
      setInitialQuestions(selectProgressiveQuestions(allQuestions, storedProfile, star.id));
      setQuestionIndex(0);
      setInitialAnswers({});
      setCalculatedScore(null);
      setCalculatedDimensions(null);
      setInterpretation(null);
      setReportGenerationError("");
    });
    return () => {
      active = false;
    };
  }, [status, email, allQuestions, star.id]);

  const currentBehaviorScore = scoreAnswers(initialAnswers, initialQuestions.length);
  const finalScore = calculatedScore ?? currentBehaviorScore;
  const currentQuestions = initialQuestions;
  const currentAnswers = initialAnswers;
  const currentQuestion = currentQuestions[questionIndex];
  const initialSnapshots = answerSnapshots(initialQuestions, initialAnswers);

  function choose(value: number) {
    if (!currentQuestion) return;
    setInitialAnswers((answers) => ({ ...answers, [currentQuestion.id]: value }));
  }

  function nextQuestion() {
    if (questionIndex < currentQuestions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    const snapshots = answerSnapshots(initialQuestions, initialAnswers);
    const sessionScores = dimensionScores(snapshots);
    const compatibility = calculateProgressiveCompatibility({
      currentScore: scoreAnswers(initialAnswers, initialQuestions.length),
      currentDimensions: sessionScores,
      profile: progressiveProfile,
      userMbti,
      birthDate: userBirthDate,
      star,
    });
    const nextProfile = recordProgressiveTest({
      email,
      profile: progressiveProfile,
      starId: star.id,
      questions: initialQuestions,
      sessionScores,
    });
    setProgressiveProfile(nextProfile);
    setCalculatedScore(compatibility.score);
    setCalculatedDimensions(compatibility.dimensionScores);
    const report = createSavedReport({
      email,
      star,
      score: compatibility.score,
      behaviorScores: compatibility.dimensionScores,
      questionCount: initialQuestions.length,
      initialTitle: initialVerdict(compatibility.score),
      answers: snapshots,
    });
    setActiveReportId(report?.id ?? null);
    setQuestionIndex(0);
    setStage("initial-result");
  }

  function unlockAdvancedReport() {
    const score = finalScore;
    const answerHistory = initialSnapshots;
    setInterpretation(null);
    setReportGenerationError("");
    setIsGeneratingReport(true);
    setStage("final");
    const reportId = activeReportId ?? createSavedReport({
      email,
      star,
      score,
      behaviorScores: calculatedDimensions ?? dimensionScores(answerHistory),
      questionCount: initialQuestions.length,
      initialTitle: initialVerdict(score),
      answers: answerHistory,
    })?.id ?? null;
    if (reportId) {
      setActiveReportId(reportId);
    }
    void personalize({
      action: "interpretation",
      starId: star.id,
      initialScore: score,
      finalScore: score,
      answers: answerHistory,
      behaviorScores: calculatedDimensions ?? dimensionScores(answerHistory),
      userMbti,
      birthDate: userBirthDate,
    }).then((result) => {
      if (result.interpretation && result.source) {
        setInterpretation(result.interpretation);
        if (reportId) updateSavedReport(email, reportId, {
          status: "advanced",
          interpretation: result.interpretation,
          interpretationSource: result.source,
        });
        return;
      }
      throw new Error("MODEL_REPORT_MISSING");
    }).catch(() => {
      setReportGenerationError("高级报告生成失败，请检查网络后重试。");
    }).finally(() => setIsGeneratingReport(false));
  }

  if (stage === "initial-result") {
    const bestChoices = Object.values(initialAnswers).filter((value) => value === 4).length;
    const signalScores = calculatedDimensions ?? dimensionScores(initialSnapshots);
    const rankedSignals = (Object.keys(signalScores) as Dimension[]).sort((a, b) => signalScores[b] - signalScores[a]);
    const strongestSignal = rankedSignals[0];
    const weakestSignal = rankedSignals.at(-1) ?? "security";
    const impressionTone = finalScore >= 82 ? "strong" : finalScore >= 58 ? "growing" : "light";
    const markerPosition = Math.round(Math.min(92, Math.max(8, ((finalScore - 25) / 75) * 100)));
    return (
      <ResultShell star={star} label="初印象" workspace={workspace}>
        <div className={`mf-initial-result mf-impression-${impressionTone}`}>
          <section className="mf-impression-card">
            <div className="mf-impression-glow" aria-hidden="true" />
            <div className="mf-impression-person">
              <div
                className="mf-impression-avatar"
                role="img"
                aria-label={star.name}
                style={{ backgroundImage: `url("${star.portraitSrc}")` }}
              />
              <div>
                <span>缘分初印象</span>
                <strong>{star.name}</strong>
              </div>
            </div>

            <div className="mf-impression-copy">
              <span className="mf-kicker">你与 TA 的初见信号</span>
              <h1>{initialVerdict(finalScore)}</h1>
              <p>有些回应，比一时的心动更接近真正的默契。</p>
            </div>

            <div className="mf-fate-spectrum" aria-label={`缘分信号位于${initialVerdict(finalScore)}`}>
              <div className="mf-spectrum-labels"><span>貌似很浅</span><span>需要加强</span><span>貌似很强</span></div>
              <div className="mf-spectrum-track">
                <i /><i /><i />
                <b style={{ left: `${markerPosition}%` }}><em>✦</em></b>
              </div>
              <small>只展示缘分区间，不公开精确分数</small>
            </div>

            <div className="mf-answer-constellation">
              <div className="mf-answer-stars" aria-label={`${initialQuestions.length}个情境中有${bestChoices}次高度默契`}>
                {initialQuestions.map((question, index) => {
                  const value = initialAnswers[question.id];
                  const level = value === 4 ? "high" : value === 3 ? "medium" : "low";
                  return <span className={`mf-answer-star ${level}`} style={{ "--star-index": index } as React.CSSProperties} key={question.id}>✦</span>;
                })}
              </div>
              <p><strong>{bestChoices}</strong> / {initialQuestions.length} 个相处瞬间中，你给出了高度贴近 TA 的回应</p>
            </div>

            <div className="mf-signal-grid">
              <article>
                <span>✦ 最有默契</span>
                <h2>{positiveSignals[strongestSignal]}</h2>
              </article>
              <article>
                <span>○ 仍需确认</span>
                <h2>{growingSignals[weakestSignal]}</h2>
              </article>
            </div>

            <button className="mf-primary-button" onClick={unlockAdvancedReport}>
              解锁缘分高级报告 <span>→</span>
            </button>
            {activeReportId ? (
              <small className="mf-report-saved-note">✓ 已保存为初步报告 · <Link href={`/home/reports/${activeReportId}`}>查看记录</Link></small>
            ) : null}
            <small className="mf-ai-note">将结合 {star.name} 的性格特征与你的 {initialQuestions.length} 次心动选择生成完整缘分画像</small>
          </section>
        </div>
      </ResultShell>
    );
  }

  if (stage === "final") {
    if (!interpretation) {
      return (
        <ResultShell star={star} label="最终正缘解读" workspace={workspace}>
          <div className="mf-report-detail-state mf-ai-generation-state">
            <span>{isGeneratingReport ? "✦" : "!"}</span>
            <h1>{isGeneratingReport ? "正在生成你的高级报告" : "高级报告暂时没有生成"}</h1>
            <p>{isGeneratingReport ? "DeepSeek 正在结合七维数据、个人资料和全部答题记录完成解读…" : reportGenerationError}</p>
            {!isGeneratingReport ? <button className="mf-primary-button" type="button" onClick={unlockAdvancedReport}>重新生成</button> : null}
          </div>
        </ResultShell>
      );
    }
    const finalSnapshots = initialSnapshots;
    const finalDimensionScores = calculatedDimensions ?? dimensionScores(finalSnapshots);
    return (
      <ResultShell star={star} label="最终正缘解读" workspace={workspace}>
        <MyfateAdvancedReport
          star={star}
          score={finalScore}
          questionCount={initialQuestions.length}
          answers={finalSnapshots}
          behaviorScores={finalDimensionScores}
          interpretation={interpretation}
          actions={(
            <>
              <button className="mf-primary-button" onClick={() => window.print()}>保存结果</button>
              {activeReportId ? <Link className="mf-secondary-button" href={`/home/reports/${activeReportId}`}>查看历史报告</Link> : null}
            </>
          )}
          disclaimer="本测试仅用于娱乐与关系想象，不构成现实关系预测。"
        />
      </ResultShell>
    );
  }

  if (!currentQuestion) return null;
  const progress = ((questionIndex + 1) / currentQuestions.length) * 100;
  return (
    <div className={workspace ? "mf-test-page mf-workspace-test" : "mf-test-page"}>
      <header className="mf-test-header">
        {workspace ? (
          <Link className="mf-back-link" href={`/home/celebrity-match/${star.id}`}>← 返回详情</Link>
        ) : (
          <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>
        )}
        <span>心动行为测试 · {initialQuestions.length} 题</span>
        <Link href={workspace ? "/home/celebrity-match" : `/celebrity/${star.id}`}>退出</Link>
      </header>
      <div className="mf-test-progress"><i style={{ width: `${progress}%` }} /></div>
      <main className="mf-question-main">
        <div className="mf-question-count">{String(questionIndex + 1).padStart(2, "0")} <span>/ {String(currentQuestions.length).padStart(2, "0")}</span></div>
        <section className="mf-question-card">
          {currentQuestion.eyebrow && <span className="mf-question-eyebrow">✦ {currentQuestion.eyebrow}</span>}
          <h1>{currentQuestion.question}</h1>
          <div className="mf-options">
            {currentQuestion.options.map((option, index) => {
              const selected = currentAnswers[currentQuestion.id] === option.value;
              return (
                <button className={selected ? "selected" : ""} key={`${option.label}-${index}`} onClick={() => choose(option.value)}>
                  <span>{String.fromCharCode(65 + index)}</span><strong>{option.label}</strong><i>{selected ? "✓" : ""}</i>
                </button>
              );
            })}
          </div>
          <div className="mf-question-nav">
            <button className="mf-text-button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}>← 上一题</button>
            <button className="mf-primary-button" disabled={!currentAnswers[currentQuestion.id]} onClick={nextQuestion}>
              {questionIndex === currentQuestions.length - 1 ? "查看初印象" : "下一题"} <span>→</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

function ResultShell({
  star,
  label,
  children,
  workspace = false,
}: {
  star: StarProfile;
  label: string;
  children: React.ReactNode;
  workspace?: boolean;
}) {
  return (
    <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}>
      <header className="mf-test-header">
        {workspace ? (
          <Link className="mf-back-link" href={`/home/celebrity-match/${star.id}`}>← 返回详情</Link>
        ) : (
          <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>
        )}
        <span>{label}</span>
        <Link href={workspace ? "/home/celebrity-match" : `/celebrity/${star.id}`}>
          {workspace ? "退出" : "返回详情"}
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
