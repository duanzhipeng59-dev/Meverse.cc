"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth-context";
import type { AnswerSnapshot } from "../../../myfate-engine";
import type { RelationshipQuestion } from "../../../relationship-profile-data";
import { createRelationshipReport } from "../../../relationship-profile-storage";

const PENDING_PROFILE_TEST_KEY = "myfate-pending-relationship-profile:v2";

type PendingProfileTest = {
  version: 2;
  answers: Record<string, number>;
};

function answerSnapshots(questions: RelationshipQuestion[], answers: Record<string, number>): AnswerSnapshot[] {
  return questions.flatMap((question) => {
    const option = question.options[answers[question.id]];
    return option ? [{
      question: question.question,
      options: question.options.map((item) => item.label),
      answer: option.label,
    }] : [];
  });
}

function readPendingProfileTest(): PendingProfileTest | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(PENDING_PROFILE_TEST_KEY) ?? "null") as PendingProfileTest | null;
    return parsed?.version === 2 && typeof parsed.answers === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function RelationshipProfileTest({ questions }: { questions: RelationshipQuestion[] }) {
  const { status, email } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const completeTest = useCallback((answerValues: Record<string, number>) => {
    const report = createRelationshipReport(email, answerSnapshots(questions, answerValues));
    router.push(`/home/relationship-profile/result/${report.id}`);
  }, [email, questions, router]);

  useEffect(() => {
    if (status === "loading") return;
    queueMicrotask(() => {
      const pending = status === "authenticated" ? readPendingProfileTest() : null;
      if (!pending) return;
      window.sessionStorage.removeItem(PENDING_PROFILE_TEST_KEY);
      setAnswers(pending.answers);
      completeTest(pending.answers);
    });
  }, [status, completeTest]);

  const current = questions[index];
  const selected = answers[current.id];
  const progress = ((index + 1) / questions.length) * 100;

  function continueToResult() {
    if (status === "anonymous") {
      const pending: PendingProfileTest = { version: 2, answers };
      window.sessionStorage.setItem(PENDING_PROFILE_TEST_KEY, JSON.stringify(pending));
      const next = `${pathname}?resume=1`;
      router.push(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(pathname)}`);
      return;
    }
    completeTest(answers);
  }

  function next() {
    if (selected === undefined) return;
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      return;
    }
    continueToResult();
  }

  return (
    <div className="mf-test-page mf-workspace-test">
      <header className="mf-test-header">
        <Link className="mf-back-link" href="/home/relationship-profile">← 返回介绍</Link>
        <span>关系行为画像 · {questions.length} 题</span>
        <Link href="/home/relationship-profile">退出</Link>
      </header>
      <div className="mf-test-progress"><i style={{ width: `${progress}%` }} /></div>
      <main className="mf-question-main">
        <div className="mf-question-count">{String(index + 1).padStart(2, "0")} <span>/ {String(questions.length).padStart(2, "0")}</span></div>
        <section className="mf-question-card">
          <h1>{current.question}</h1>
          <div className="mf-options">
            {current.options.map((option, optionIndex) => {
              const active = selected === optionIndex;
              return (
                <button className={active ? "selected" : ""} type="button" key={option.label} onClick={() => setAnswers((all) => ({ ...all, [current.id]: optionIndex }))}>
                  <span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option.label}</strong><i>{active ? "✓" : ""}</i>
                </button>
              );
            })}
          </div>
          <div className="mf-question-nav">
            <button className="mf-text-button" type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>← 上一题</button>
            <button className="mf-primary-button" type="button" disabled={selected === undefined} onClick={next}>
              {index === questions.length - 1
                ? status === "anonymous" ? "登录并生成报告" : "生成关系报告"
                : "下一题"} <span>→</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
