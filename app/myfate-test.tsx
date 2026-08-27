"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "./auth-context";
import { ensureLocalUser, normalizeEmail } from "./local-auth";
import { createInitialQuestions, type StarProfile, type TestQuestion } from "./myfate-data";
import type { AnswerSnapshot } from "./myfate-engine";
import MyfateAdvancedReport from "./myfate-advanced-report";
import { readBasicProfile, writeBasicProfile } from "./myfate-progressive-profile";
import { createSavedReport, updateSavedReport } from "./myfate-report-storage";

type Stage = "test" | "report";

type PendingFateTest = {
  version: 2;
  starId: string;
  questionIds: string[];
  answers: Record<string, number>;
};

function pendingFateTestKey(starId: string) {
  return `myfate-pending-fate-test:v2:${starId}`;
}

function readPendingFateTest(starId: string): PendingFateTest | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(pendingFateTestKey(starId)) ?? "null") as PendingFateTest | null;
    return parsed?.version === 2 && parsed.starId === starId && Array.isArray(parsed.questionIds) ? parsed : null;
  } catch {
    return null;
  }
}

function savePendingFateTest(draft: PendingFateTest) {
  window.sessionStorage.setItem(pendingFateTestKey(draft.starId), JSON.stringify(draft));
}

function clearPendingFateTest(starId: string) {
  window.sessionStorage.removeItem(pendingFateTestKey(starId));
}

function answerSnapshots(questions: TestQuestion[], answers: Record<string, number>): AnswerSnapshot[] {
  return questions.flatMap((question) => {
    const option = question.options[answers[question.id]];
    return option ? [{
      question: question.question,
      options: question.options.map((item) => item.label),
      answer: option.label,
    }] : [];
  });
}

type ReportResponse = {
  report?: string;
  source?: "deepseek" | "gemini";
};

async function generateReport(body: Record<string, unknown>): Promise<ReportResponse> {
  const response = await fetch("/api/myfate/personalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });
  if (!response.ok) throw new Error("REPORT_GENERATION_FAILED");
  return response.json() as Promise<ReportResponse>;
}

export default function MyfateTest({ star, workspace = false, questions }: { star: StarProfile; workspace?: boolean; questions?: TestQuestion[] }) {
  const { status, markAuthenticated } = useAuth();
  const allQuestions = useMemo(() => questions ?? createInitialQuestions(star), [questions, star]);
  const [currentQuestions, setCurrentQuestions] = useState(allQuestions);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [stage, setStage] = useState<Stage>("test");
  const [reportText, setReportText] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportGenerationError, setReportGenerationError] = useState("");
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");

  const completeTest = useCallback(async (testQuestions: TestQuestion[], answerValues: Record<string, number>) => {
    const snapshots = answerSnapshots(testQuestions, answerValues);
    setCurrentQuestions(testQuestions);
    setAnswers(answerValues);
    setStage("report");
    setReportText("");
    setReportGenerationError("");
    setIsGeneratingReport(true);

    const savedReport = await createSavedReport({
      star,
      questionCount: testQuestions.length,
      answers: snapshots,
    });
    const reportId = savedReport?.id ?? null;

    try {
      const result = await generateReport({
        action: "report",
        reportType: "celebrity-match",
        starId: star.id,
        answers: snapshots,
      });
      if (!result.report || !result.source) throw new Error("MODEL_REPORT_MISSING");
      setReportText(result.report);
      if (reportId) {
        await updateSavedReport(reportId, {
          status: "advanced",
          reportText: result.report,
          interpretationSource: result.source,
        });
      }
    } catch {
      if (reportId) await updateSavedReport(reportId, { status: "initial" });
      setReportGenerationError("报告生成失败，请检查网络后重试。");
    } finally {
      setIsGeneratingReport(false);
    }
  }, [star]);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const pending = status === "authenticated" ? readPendingFateTest(star.id) : null;
      if (pending) {
        const pendingQuestions = pending.questionIds
          .map((id) => allQuestions.find((question) => question.id === id))
          .filter((question): question is TestQuestion => Boolean(question));
        clearPendingFateTest(star.id);
        if (pendingQuestions.length === pending.questionIds.length && pendingQuestions.length > 0) {
          void completeTest(pendingQuestions, pending.answers);
          return;
        }
      }
      setCurrentQuestions(allQuestions);
      setAnswers({});
      setQuestionIndex(0);
      setStage("test");
      setReportText("");
      setReportGenerationError("");
    });
    return () => { active = false; };
  }, [status, allQuestions, star.id, completeTest]);

  const currentQuestion = currentQuestions[questionIndex];

  function choose(optionIndex: number) {
    if (!currentQuestion) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: optionIndex }));
  }

  function continueToReport() {
    if (status === "anonymous") {
      savePendingFateTest({
        version: 2,
        starId: star.id,
        questionIds: currentQuestions.map((question) => question.id),
        answers,
      });
      setLoginError("");
      setLoginPromptOpen(true);
      return;
    }
    void completeTest(currentQuestions, answers);
  }

  function loginAndViewReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeEmail(loginEmail);
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setLoginError("请输入有效的邮箱地址");
      return;
    }

    try {
      const user = ensureLocalUser(normalized);
      if (user.created) writeBasicProfile(user.email, readBasicProfile(null));
      setLoginPromptOpen(false);
      markAuthenticated(user.email);
    } catch {
      setLoginError("登录信息暂时无法保存，请稍后重试");
    }
  }

  function nextQuestion() {
    if (questionIndex < currentQuestions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    continueToReport();
  }

  if (stage === "report") {
    if (!reportText) {
      return (
        <ResultShell star={star} label={isGeneratingReport ? "" : "关系报告"} workspace={workspace}>
          <div className="mf-report-detail-state mf-ai-generation-state">
            <span>{isGeneratingReport ? "✦" : "!"}</span>
            <h1>{isGeneratingReport ? "正在生成报告" : "报告暂时没有生成"}</h1>
            <p>{isGeneratingReport ? "正在阅读你本次测试中的全部选择，并为你写成一份完整报告。" : reportGenerationError}</p>
            {isGeneratingReport ? (
              <>
                <div className="mf-report-generation-progress" role="progressbar" aria-label="报告生成中" aria-valuetext="正在生成">
                  <i />
                </div>
                <small className="mf-report-generation-note">可以离开当前页面，完成后会自动保存到“我的报告”</small>
              </>
            ) : (
              <button className="mf-primary-button" type="button" onClick={() => void completeTest(currentQuestions, answers)}>重新生成</button>
            )}
          </div>
        </ResultShell>
      );
    }
    return (
      <ResultShell star={star} label="关系报告" workspace={workspace}>
        <MyfateAdvancedReport
          star={star}
          reportText={reportText}
          questionCount={currentQuestions.length}
          actions={(
            <Link className="mf-secondary-button" href="/home/reports">查看历史记录</Link>
          )}
        />
      </ResultShell>
    );
  }

  if (!currentQuestion) return null;
  const progress = loginPromptOpen ? 100 : ((questionIndex + 1) / currentQuestions.length) * 100;
  return (
    <div className={workspace ? "mf-test-page mf-workspace-test" : "mf-test-page"}>
      <header className="mf-test-header">
        {workspace ? (
          <Link className="mf-back-link" href={`/home/celebrity-match/${star.id}`}>← 返回详情</Link>
        ) : (
          <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>
        )}
        <span>心动行为测试 · {currentQuestions.length} 题</span>
        <Link href={workspace ? "/home/celebrity-match" : `/celebrity/${star.id}`}>退出</Link>
      </header>
      <div className="mf-test-progress"><i style={{ width: `${progress}%` }} /></div>
      <main className="mf-question-main">
        <div className="mf-question-count">
          {String(loginPromptOpen ? currentQuestions.length : questionIndex + 1).padStart(2, "0")} <span>/ {String(currentQuestions.length).padStart(2, "0")}</span>
        </div>
        {loginPromptOpen ? (
          <section className="mf-question-card mf-profile-question-card mf-report-login-question">
            <span className="mf-question-eyebrow">测试已完成 · 最后一步</span>
            <h1>留下邮箱，查看你的专属报告</h1>
            <p>邮箱会用于关联本次报告，首次使用会自动创建账号。</p>
            <form className="mf-report-login-question-form" onSubmit={loginAndViewReport}>
              <label className="mf-report-login-answer">
                <span aria-hidden="true">A</span>
                <input
                  type="email"
                  value={loginEmail}
                  autoComplete="email"
                  placeholder="name@example.com"
                  autoFocus
                  required
                  onChange={(event) => {
                    setLoginEmail(event.target.value);
                    setLoginError("");
                  }}
                />
              </label>
              <div className="mf-report-login-error" aria-live="polite">{loginError}</div>
              <div className="mf-question-nav">
                <button className="mf-text-button" type="button" onClick={() => setLoginPromptOpen(false)}>← 返回上一题</button>
                <button className="mf-primary-button" type="submit">登录查看报告 <span>→</span></button>
              </div>
            </form>
          </section>
        ) : (
          <section className="mf-question-card">
            <h1>{currentQuestion.question}</h1>
            <div className="mf-options">
              {currentQuestion.options.map((option, index) => {
                const selected = answers[currentQuestion.id] === index;
                return (
                  <button className={selected ? "selected" : ""} type="button" key={`${option.label}-${index}`} onClick={() => choose(index)}>
                    <span>{String.fromCharCode(65 + index)}</span><strong>{option.label}</strong><i>{selected ? "✓" : ""}</i>
                  </button>
                );
              })}
            </div>
            <div className="mf-question-nav">
              <button className="mf-text-button" type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}>← 上一题</button>
              <button className="mf-primary-button" type="button" disabled={answers[currentQuestion.id] === undefined} onClick={nextQuestion}>
                {questionIndex === currentQuestions.length - 1
                  ? status === "anonymous" ? "完成测试" : "生成关系报告"
                  : "下一题"} <span>→</span>
              </button>
            </div>
          </section>
        )}
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
        {label ? <span>{label}</span> : null}
        <Link href={workspace ? "/home/celebrity-match" : `/celebrity/${star.id}`}>{workspace ? "退出" : "返回详情"}</Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
