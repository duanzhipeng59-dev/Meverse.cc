"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../../auth-context";
import { calculateRelationshipScores, relationshipArchetype, relationshipQuestions } from "../../../relationship-profile-data";
import { createRelationshipReport } from "../../../relationship-profile-storage";

export default function RelationshipProfileTest() {
  const { email } = useAuth();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const current = relationshipQuestions[index];
  const selected = answers[current.id];
  const progress = ((index + 1) / relationshipQuestions.length) * 100;

  function next() {
    if (selected === undefined) return;
    if (index < relationshipQuestions.length - 1) { setIndex((value) => value + 1); return; }
    const scores = calculateRelationshipScores(answers);
    const report = createRelationshipReport(email, { title: relationshipArchetype(scores), scores, answers });
    router.push(`/home/relationship-profile/result/${report.id}`);
  }

  return (
    <div className="mf-test-page mf-workspace-test">
      <header className="mf-test-header">
        <Link className="mf-back-link" href="/home/relationship-profile">← 返回介绍</Link>
        <span>关系行为画像 · 24 题</span>
        <Link href="/home/relationship-profile">退出</Link>
      </header>
      <div className="mf-test-progress"><i style={{ width: `${progress}%` }} /></div>
      <main className="mf-question-main">
        <div className="mf-question-count">{String(index + 1).padStart(2, "0")} <span>/ 24</span></div>
        <section className="mf-question-card">
          <span className="mf-question-eyebrow">✦ {current.eyebrow}</span>
          <h1>{current.question}</h1>
          <div className="mf-options">
            {current.options.map((option, optionIndex) => {
              const active = selected === option.value;
              return <button className={active ? "selected" : ""} type="button" key={option.label} onClick={() => setAnswers((all) => ({ ...all, [current.id]: option.value }))}>
                <span>{String.fromCharCode(65 + optionIndex)}</span><strong>{option.label}</strong><i>{active ? "✓" : ""}</i>
              </button>;
            })}
          </div>
          <div className="mf-question-nav">
            <button className="mf-text-button" type="button" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>← 上一题</button>
            <button className="mf-primary-button" type="button" disabled={selected === undefined} onClick={next}>{index === 23 ? "生成我的画像" : "下一题"} <span>→</span></button>
          </div>
        </section>
      </main>
    </div>
  );
}
