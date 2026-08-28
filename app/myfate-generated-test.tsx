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
  testId: string;
  questions: GeneratedTestQuestion[];
};

export default function MyfateGeneratedTest({ star, workspace = false }: { star: StarProfile; workspace?: boolean }) {
  const { status } = useAuth();
  const started = useRef(false);
  const [testId, setTestId] = useState("");
  const [questions, setQuestions] = useState<GeneratedTestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<FormulaTestResult | null>(null);
  const [phase, setPhase] = useState<"loading" | "test" | "evaluating" | "result" | "error">("loading");
  const [error, setError] = useState("");

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
    const report = await createSavedReport({ star, questionCount: resultQuestions.length, answers: snapshots });
    if (report) {
      await updateSavedReport(report.id, {
        status: "advanced",
        reportText: serializeFormulaResult(generatedResult),
        interpretationSource: "deepseek",
        score: generatedResult.correctCount,
      });
    }
  }, [star]);

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
      body: JSON.stringify({ answers: orderedAnswers }),
    });
    if (!response.ok) throw new Error(response.status === 410 ? "本次测试已过期，请重新生成。" : "结果计算失败，请稍后重试。");
    const body = await response.json() as { result: FormulaTestResult };
    setResult(body.result);
    setPhase("result");
    await saveResult(body.result, targetQuestions, targetAnswers);
  }, [saveResult]);

  const generate = useCallback(async () => {
    setPhase("loading");
    setError("");
    const response = await fetch("/api/myfate/generated-tests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ starId: star.id }),
    });
    if (response.status === 401) {
      const next = `/home/celebrity-match/${star.id}/test`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/celebrity-match/${star.id}`)}`);
      return;
    }
    if (!response.ok) throw new Error("专属题目生成失败，请稍后重试。");
    const body = await response.json() as GeneratedResponse;
    setTestId(body.testId);
    setQuestions(body.questions);
    setAnswers({});
    setIndex(0);
    setPhase("test");
  }, [star.id]);

  useEffect(() => {
    if (status === "loading" || started.current) return;
    if (status === "anonymous") {
      started.current = true;
      const next = `/home/celebrity-match/${star.id}/test`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/celebrity-match/${star.id}`)}`);
      return;
    }
    started.current = true;
    const start = async () => {
      try {
        await generate();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "暂时无法开始测试");
        setPhase("error");
      }
    };
    void start();
  }, [evaluate, generate, star.id, status]);

  function finish() {
    if (status !== "authenticated") {
      const next = `/home/celebrity-match/${star.id}/test`;
      window.location.assign(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/celebrity-match/${star.id}`)}`);
      return;
    }
    void evaluate(testId, questions, answers).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "结果计算失败");
      setPhase("error");
    });
  }

  if (phase === "loading" || phase === "evaluating") {
    return <StateShell star={star} workspace={workspace} icon="✦" title={phase === "loading" ? `正在为你生成一套全新的 ${star.name} 专属题目` : "正在核对你的每一次选择"} detail={phase === "loading" ? "题目、正确回应和原因会在此刻一次生成，预计需要几十秒。" : "结果只按本次封存的正确答案计算，不会再次调用大模型改写结论。"} />;
  }
  if (phase === "error") {
    return <StateShell star={star} workspace={workspace} icon="!" title="这次测试暂时没有准备好" detail={error} action={<button className="mf-primary-button" type="button" onClick={() => { started.current = true; void generate().catch(() => setPhase("error")); }}>重新生成</button>} />;
  }
  if (phase === "result" && result) {
    return (
      <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}>
        <TestHeader star={star} workspace={workspace} label="正缘结果" />
        <main><MyfateFormulaResult star={star} result={result} actions={<><Link className="mf-secondary-button" href="/home/reports">查看历史记录</Link><button className="mf-primary-button" type="button" onClick={() => window.location.assign(`/home/celebrity-match/${star.id}/test?restart=${Date.now()}`)}>再测一次</button></>} /></main>
      </div>
    );
  }

  const question = questions[index];
  if (!question) return null;
  const progress = ((index + 1) / questions.length) * 100;
  return (
    <div className={workspace ? "mf-test-page mf-workspace-test" : "mf-test-page"}>
      <TestHeader star={star} workspace={workspace} label={`专属正缘测试 · ${questions.length} 题`} />
      <div className="mf-test-progress"><i style={{ width: `${progress}%` }} /></div>
      <main className="mf-question-main">
        <div className="mf-question-count">{String(index + 1).padStart(2, "0")} <span>/ {questions.length}</span></div>
        <section className="mf-question-card">
          <span className="mf-question-eyebrow">{question.eyebrow}{question.riskItem ? " · 关键情境" : ""}</span>
          <h1>{question.question}</h1>
          <div className="mf-options">
            {question.options.map((option, optionIndex) => {
              const selected = answers[question.id] === optionIndex;
              return <button className={selected ? "selected" : ""} type="button" key={`${option.label}-${optionIndex}`} onClick={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}><span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option.label}</strong><i>{selected ? "✓" : ""}</i></button>;
            })}
          </div>
          <div className="mf-question-nav">
            <button className="mf-text-button" type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>← 上一题</button>
            <button className="mf-primary-button" type="button" disabled={answers[question.id] === undefined} onClick={() => index < questions.length - 1 ? setIndex((value) => value + 1) : finish()}>{index < questions.length - 1 ? "下一题" : "查看正缘结果"} <span>→</span></button>
          </div>
        </section>
      </main>
    </div>
  );
}

function TestHeader({ star, workspace, label }: { star: StarProfile; workspace: boolean; label: string }) {
  return <header className="mf-test-header">{workspace ? <Link className="mf-back-link" href={`/home/celebrity-match/${star.id}`}>← 返回详情</Link> : <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>}<span>{label}</span><Link href={workspace ? "/home/celebrity-match" : `/celebrity/${star.id}`}>退出</Link></header>;
}

function StateShell({ star, workspace, icon, title, detail, action }: { star: StarProfile; workspace: boolean; icon: string; title: string; detail: string; action?: React.ReactNode }) {
  return <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}><TestHeader star={star} workspace={workspace} label="专属正缘测试" /><main><div className="mf-report-detail-state mf-ai-generation-state"><span>{icon}</span><h1>{title}</h1><p>{detail}</p>{phaseBar(icon)}{action}</div></main></div>;
}

function phaseBar(icon: string) {
  return icon === "✦" ? <div className="mf-report-generation-progress" role="progressbar" aria-label="生成中"><i /></div> : null;
}
