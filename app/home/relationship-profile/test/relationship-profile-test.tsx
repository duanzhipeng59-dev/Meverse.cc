"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../../auth-context";
import { calculateRelationshipScores, relationshipArchetype, relationshipQuestions } from "../../../relationship-profile-data";
import { createRelationshipReport } from "../../../relationship-profile-storage";
import { MBTI_TYPES, readBasicProfile, validBirthDate, validMbti, writeBasicProfile } from "../../../myfate-progressive-profile";

const PENDING_PROFILE_TEST_KEY = "myfate-pending-relationship-profile:v1";

type PendingProfileTest = {
  version: 1;
  answers: Record<string, number>;
  birthDate: string;
  mbti: string;
};

function readPendingProfileTest(): PendingProfileTest | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(PENDING_PROFILE_TEST_KEY) ?? "null") as PendingProfileTest | null;
    return parsed?.version === 1 && typeof parsed.answers === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export default function RelationshipProfileTest() {
  const { status, email } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [birthDate, setBirthDate] = useState("");
  const [mbti, setMbti] = useState("");
  const [requiredProfileFields, setRequiredProfileFields] = useState({ birthDate: true, mbti: true });
  const [profileQuestionOpen, setProfileQuestionOpen] = useState(false);

  const completeTest = useCallback((answerValues: Record<string, number>) => {
    const scores = calculateRelationshipScores(answerValues);
    const report = createRelationshipReport(email, { title: relationshipArchetype(scores), scores, answers: answerValues });
    router.push(`/home/relationship-profile/result/${report.id}`);
  }, [email, router]);

  useEffect(() => {
    if (status === "loading") return;
    queueMicrotask(() => {
      const basicProfile = readBasicProfile(email);
      const pending = status === "authenticated" ? readPendingProfileTest() : null;
      if (pending) {
        window.sessionStorage.removeItem(PENDING_PROFILE_TEST_KEY);
        writeBasicProfile(email, {
          ...basicProfile,
          birthDate: pending.birthDate,
          mbti: pending.mbti,
        });
        setBirthDate(pending.birthDate);
        setMbti(pending.mbti);
        setAnswers(pending.answers);
        completeTest(pending.answers);
        return;
      }
      setBirthDate(basicProfile.birthDate);
      setMbti(basicProfile.mbti);
      setRequiredProfileFields({
        birthDate: !validBirthDate(basicProfile.birthDate),
        mbti: !validMbti(basicProfile.mbti),
      });
    });
  }, [status, email, completeTest]);

  const current = relationshipQuestions[index];
  const selected = answers[current.id];
  const hasProfileQuestion = requiredProfileFields.birthDate || requiredProfileFields.mbti;
  const totalQuestionCount = relationshipQuestions.length + (hasProfileQuestion ? 1 : 0);
  const progress = ((index + 1) / totalQuestionCount) * 100;

  function continueToResult(profileBirthDate = birthDate, profileMbti = mbti) {
    const storedProfile = readBasicProfile(email);
    writeBasicProfile(email, { ...storedProfile, birthDate: profileBirthDate, mbti: profileMbti });
    if (status === "anonymous") {
      const pending: PendingProfileTest = { version: 1, answers, birthDate: profileBirthDate, mbti: profileMbti };
      window.sessionStorage.setItem(PENDING_PROFILE_TEST_KEY, JSON.stringify(pending));
      const next = `${pathname}?resume=1`;
      router.push(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(pathname)}`);
      return;
    }
    completeTest(answers);
  }

  function next() {
    if (selected === undefined) return;
    if (index < relationshipQuestions.length - 1) {
      setIndex((value) => value + 1);
      return;
    }
    if (hasProfileQuestion) {
      setProfileQuestionOpen(true);
      return;
    }
    continueToResult();
  }

  function saveProfileAndContinue() {
    if ((requiredProfileFields.birthDate && !validBirthDate(birthDate)) || (requiredProfileFields.mbti && !validMbti(mbti))) return;
    continueToResult(birthDate, mbti);
  }

  if (profileQuestionOpen) {
    const canSubmit = (!requiredProfileFields.birthDate || validBirthDate(birthDate))
      && (!requiredProfileFields.mbti || validMbti(mbti));
    return (
      <div className="mf-test-page mf-workspace-test">
        <header className="mf-test-header">
          <Link className="mf-back-link" href="/home/relationship-profile">← 返回介绍</Link>
          <span>关系行为画像 · {totalQuestionCount} 题</span>
          <Link href="/home/relationship-profile">退出</Link>
        </header>
        <div className="mf-test-progress"><i style={{ width: "100%" }} /></div>
        <main className="mf-question-main">
          <div className="mf-question-count">{String(totalQuestionCount).padStart(2, "0")} <span>/ {String(totalQuestionCount).padStart(2, "0")}</span></div>
          <section className="mf-question-card mf-profile-question-card">
            <span className="mf-question-eyebrow">✦ 最后一步</span>
            <h1>补全你的专属资料</h1>
            <p>填写出生日期和 MBTI 后，即可解锁你的关系行为画像。</p>
            <div className="mf-profile-question-fields">
              {requiredProfileFields.birthDate ? (
                <label className="mf-profile-field">
                  <span>出生日期</span>
                  <input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} />
                </label>
              ) : null}
              {requiredProfileFields.mbti ? (
                <label className="mf-profile-field">
                  <span>MBTI</span>
                  <select value={mbti} onChange={(event) => setMbti(event.target.value)}>
                    <option value="">请选择你的 MBTI</option>
                    {MBTI_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}
                  </select>
                </label>
              ) : null}
            </div>
            <div className="mf-question-nav">
              <button className="mf-text-button" type="button" onClick={() => setProfileQuestionOpen(false)}>← 上一题</button>
              <button className="mf-primary-button" type="button" disabled={!canSubmit} onClick={saveProfileAndContinue}>
                {status === "anonymous" ? "登录并查看结果" : "保存并查看结果"} <span>→</span>
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="mf-test-page mf-workspace-test">
      <header className="mf-test-header">
        <Link className="mf-back-link" href="/home/relationship-profile">← 返回介绍</Link>
        <span>关系行为画像 · {totalQuestionCount} 题</span>
        <Link href="/home/relationship-profile">退出</Link>
      </header>
      <div className="mf-test-progress"><i style={{ width: `${progress}%` }} /></div>
      <main className="mf-question-main">
        <div className="mf-question-count">{String(index + 1).padStart(2, "0")} <span>/ {String(totalQuestionCount).padStart(2, "0")}</span></div>
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
            <button className="mf-primary-button" type="button" disabled={selected === undefined} onClick={next}>
              {index === relationshipQuestions.length - 1 && hasProfileQuestion
                ? "填写个人资料"
                : index === relationshipQuestions.length - 1 && status === "anonymous"
                  ? "登录并查看结果"
                  : index === relationshipQuestions.length - 1 ? "生成我的画像" : "下一题"} <span>→</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
