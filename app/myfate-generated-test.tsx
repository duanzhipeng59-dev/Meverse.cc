"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import type { StarProfile } from "./myfate-data";
import MyfateFormulaResult from "./myfate-formula-result";
import {
  serializeFormulaResult,
  type FormulaTestResult,
  type GeneratedTestQuestion,
} from "./myfate-generated-test-types";
import { createSavedReport, updateSavedReport } from "./myfate-report-storage";

type GeneratedResponse = {
  status?: "generating" | "ready";
  testId: string;
  questions: GeneratedTestQuestion[];
  savedAnswers?: Array<{ question: string; answer: string }>;
};

const FOREGROUND_POLL_INTERVAL_MS = 1500;
const BACKGROUND_POLL_INTERVAL_MS = 5000;

export default function MyfateGeneratedTest({ star, workspace = false }: { star: StarProfile; workspace?: boolean }) {
  const { status } = useAuth();
  const started = useRef(false);
  const active = useRef(true);
  const answerSaveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [reportId, setReportId] = useState("");
  const [testId, setTestId] = useState("");
  const [questions, setQuestions] = useState<GeneratedTestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<FormulaTestResult | null>(null);
  const [phase, setPhase] = useState<"loading" | "test" | "evaluating" | "result" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const saveResult = useCallback(async (
    generatedResult: FormulaTestResult,
    resultQuestions: GeneratedTestQuestion[],
    resultAnswers: Record<string, number>,
  ) => {
    const snapshots = resultQuestions.map((question) => ({
      question: question.question,
      options: question.options.map((option) => option.label),
      answer: question.options[resultAnswers[question.id]]?.label ?? "",
    }));
    if (reportId) {
      await updateSavedReport(reportId, {
        status: "advanced",
        reportText: serializeFormulaResult(generatedResult),
        interpretationSource: "deepseek",
        score: generatedResult.version === 2
          ? Math.min(25, Math.round(generatedResult.primaryRole.score / 2))
          : generatedResult.correctCount,
        questionCount: resultQuestions.length,
        answers: snapshots,
      });
    }
  }, [reportId]);

  const evaluate = useCallback(async (
    targetTestId: string,
    targetQuestions: GeneratedTestQuestion[],
    targetAnswers: Record<string, number>,
  ) => {
    setPhase("evaluating");
    const orderedAnswers = targetQuestions.map((question) => targetAnswers[question.id]);
    const response = await fetch(`/api/myfate/generated-tests/${encodeURIComponent(targetTestId)}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: orderedAnswers, reportId }),
    });
    if (!response.ok) throw new Error(response.status === 410 ? "本次测试已过期，请重新生成。" : "结果计算失败，请稍后重试。");
    const body = await response.json() as { result: FormulaTestResult };
    setResult(body.result);
    setPhase("result");
    await saveResult(body.result, targetQuestions, targetAnswers);
  }, [reportId, saveResult]);

  const loadGeneratedTest = useCallback(async (targetReportId: string) => {
    while (active.current) {
      const response = await fetch(`/api/myfate/generated-tests?reportId=${encodeURIComponent(targetReportId)}`, { cache: "no-store" });
      if (response.status === 202) {
        const delay = document.visibilityState === "visible" ? FOREGROUND_POLL_INTERVAL_MS : BACKGROUND_POLL_INTERVAL_MS;
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        continue;
      }
      if (response.status === 409) throw new Error("关系测试生成失败，请重新生成。");
      if (response.status === 410) throw new Error("本次测试已过期，请重新生成。");
      if (!response.ok) throw new Error("暂时无法读取这套关系测试。");
      const body = await response.json() as GeneratedResponse;
      if (!body.testId || !Array.isArray(body.questions)) throw new Error("关系测试数据不完整。");
      if (!active.current) return;
      const restoredAnswers = body.questions.reduce<Record<string, number>>((restored, question) => {
        const saved = body.savedAnswers?.find((answer) => answer.question === question.question);
        const optionIndex = saved ? question.options.findIndex((option) => option.label === saved.answer) : -1;
        if (optionIndex >= 0) restored[question.id] = optionIndex;
        return restored;
      }, {});
      const firstUnanswered = body.questions.findIndex((question) => restoredAnswers[question.id] === undefined);
      setTestId(body.testId);
      setQuestions(body.questions);
      setAnswers(restoredAnswers);
      setIndex(firstUnanswered >= 0 ? firstUnanswered : Math.max(0, body.questions.length - 1));
      setPhase("test");
      return;
    }
  }, [setAnswers, setIndex, setPhase, setQuestions, setTestId]);

  const generate = useCallback(async (existingReportId?: string) => {
    setPhase("loading");
    setError("");
    let targetReportId = existingReportId;
    if (!targetReportId) {
      const report = await createSavedReport({
        star,
        answers: [],
        initialTitle: "关系题目生成中",
      });
      if (!report) throw new Error("暂时无法创建测试记录。");
      targetReportId = report.id;
      setReportId(report.id);
      const url = new URL(window.location.href);
      url.searchParams.set("report", report.id);
      url.searchParams.delete("restart");
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    }
    const response = await fetch("/api/myfate/generated-tests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ starId: star.id, reportId: targetReportId }),
    });
    if (response.status === 401) {
      const next = `/home/relationship-test/${star.id}/test`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/relationship-test/${star.id}`)}`);
      return;
    }
    if (!response.ok) throw new Error("关系题目生成失败，请稍后重试。");
    await loadGeneratedTest(targetReportId);
  }, [loadGeneratedTest, star]);

  useEffect(() => {
    if (status === "loading" || started.current) return;
    if (status === "anonymous") {
      started.current = true;
      const next = `/home/relationship-test/${star.id}/test`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/relationship-test/${star.id}`)}`);
      return;
    }
    started.current = true;
    const start = async () => {
      try {
        const existingReportId = new URLSearchParams(window.location.search).get("report");
        if (existingReportId) {
          setReportId(existingReportId);
          await loadGeneratedTest(existingReportId);
        } else {
          await generate();
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "暂时无法开始测试");
        setPhase("error");
      }
    };
    void start();
  }, [generate, loadGeneratedTest, star.id, status]);

  function finish() {
    if (status !== "authenticated") {
      const next = `/home/relationship-test/${star.id}/test`;
      window.location.assign(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/relationship-test/${star.id}`)}`);
      return;
    }
    void evaluate(testId, questions, answers).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "结果计算失败");
      setPhase("error");
    });
  }

  function selectAnswer(questionId: string, optionIndex: number) {
    const next = { ...answers, [questionId]: optionIndex };
    setAnswers(next);
    if (!reportId) return;
    const snapshots = questions
      .filter((item) => next[item.id] !== undefined)
      .map((item) => ({
        question: item.question,
        options: item.options.map((option) => option.label),
        answer: item.options[next[item.id]]?.label ?? "",
      }));
    answerSaveQueue.current = answerSaveQueue.current
      .catch(() => null)
      .then(() => updateSavedReport(reportId, { answers: snapshots }));
  }

  if (phase === "loading" || phase === "evaluating") {
    return <StateShell star={star} workspace={workspace} icon="✦" title={phase === "loading" ? "正在为你生成关系测试" : "正在整理你的关系身份"} detail={phase === "loading" ? "退出此界面后，测试仍会在后台生成，可前往「我的报告」查看。" : "系统正在汇总每次选择呈现的关系位置，没有正确或错误答案。"} hideExit={phase === "loading"} />;
  }
  if (phase === "error") {
    return <StateShell star={star} workspace={workspace} icon="!" title="这次测试暂时没有准备好" detail={error} action={<button className="mf-primary-button" type="button" onClick={() => { active.current = true; void generate(reportId || undefined).catch(() => setPhase("error")); }}>重新生成</button>} />;
  }
  if (phase === "result" && result) {
    return (
      <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}>
        <TestHeader star={star} workspace={workspace} label="关系身份结果" />
        <main><MyfateFormulaResult star={star} result={result} actions={<><Link className="mf-secondary-button" href="/home/reports">查看历史记录</Link><button className="mf-primary-button" type="button" onClick={() => window.location.assign(`/home/relationship-test/${star.id}/test?restart=${Date.now()}`)}>再测一次</button></>} /></main>
      </div>
    );
  }

  const question = questions[index];
  if (!question) return null;
  const progress = ((index + 1) / questions.length) * 100;
  return (
    <div className={workspace ? "mf-test-page mf-workspace-test" : "mf-test-page"}>
      <TestHeader star={star} workspace={workspace} label={`关系身份测试 · ${questions.length} 题`} />
      <div className="mf-test-progress"><i style={{ width: `${progress}%` }} /></div>
      <main className="mf-question-main">
        <div className="mf-question-count">{String(index + 1).padStart(2, "0")} <span>/ {questions.length}</span></div>
        <section className="mf-question-card">
          <h1>{question.question}</h1>
          <div className="mf-options">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.id] === optionIndex;
              return <button className={selected ? "selected" : ""} type="button" key={`${option.label}-${optionIndex}`} onClick={() => selectAnswer(question.id, optionIndex)}><span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option.label}</strong><i>{selected ? "✓" : ""}</i></button>;
            })}
          </div>
          <div className="mf-question-nav">
            <button className="mf-text-button" type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>← 上一题</button>
            <button className="mf-primary-button" type="button" disabled={answers[question.id] === undefined} onClick={() => index < questions.length - 1 ? setIndex((value) => value + 1) : finish()}>{index < questions.length - 1 ? "下一题" : "查看关系身份"} <span>→</span></button>
          </div>
        </section>
      </main>
    </div>
  );
}

function TestHeader({ star, workspace, label, hideExit = false }: { star: StarProfile; workspace: boolean; label: string; hideExit?: boolean }) {
  return <header className="mf-test-header">{workspace ? <Link className="mf-back-link" href={`/home/relationship-test/${star.id}`}>← 返回详情</Link> : <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>}<span>{label}</span>{hideExit ? <span aria-hidden="true" /> : <Link href={workspace ? "/home/relationship-test" : `/celebrity/${star.id}`}>退出</Link>}</header>;
}

function StateShell({ star, workspace, icon, title, detail, action, hideExit = false }: { star: StarProfile; workspace: boolean; icon: string; title: string; detail: string; action?: React.ReactNode; hideExit?: boolean }) {
  return <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}><TestHeader star={star} workspace={workspace} label="关系身份测试" hideExit={hideExit} /><main><div className="mf-report-detail-state mf-ai-generation-state"><span>{icon}</span><h1>{title}</h1><p>{detail}</p>{phaseBar(icon)}{action}</div></main></div>;
}

function phaseBar(icon: string) {
  return icon === "✦" ? <div className="mf-report-generation-progress" role="progressbar" aria-label="生成中"><i /></div> : null;
}
