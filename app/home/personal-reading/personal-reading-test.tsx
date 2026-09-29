"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth-context";
import { vedicCities } from "../../myfate-cities";
import { readBasicProfile, validBirthDate, writeBasicProfile } from "../../myfate-progressive-profile";
import MyfateBaziResult from "../../myfate-bazi-result";
import type { BaziReadingResult } from "../../myfate-bazi-types";

const PAGE_PATH = "/home/personal-reading";

export default function PersonalReadingTest() {
  const { status, email } = useAuth();
  const started = useRef(false);
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("00:00");
  const [birthCityId, setBirthCityId] = useState("");
  const [result, setResult] = useState<BaziReadingResult | null>(null);
  const [phase, setPhase] = useState<"loading" | "form" | "analyzing" | "result" | "error">("loading");
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (status === "loading" || started.current) return;
    if (status === "anonymous") {
      started.current = true;
      window.location.replace(`/login?next=${encodeURIComponent(PAGE_PATH)}&from=${encodeURIComponent(PAGE_PATH)}`);
      return;
    }
    started.current = true;
    const existingReportId = new URLSearchParams(window.location.search).get("report");
    if (existingReportId) {
      window.location.replace(`/home/reports/${encodeURIComponent(existingReportId)}`);
      return;
    }
    const profile = readBasicProfile(email);
    setBirthDate(profile.birthDate);
    setBirthTime(profile.birthTime || "00:00");
    setBirthCityId(profile.birthCityId);
    setPhase("form");
  }, [email, status]);

  async function createReading() {
    if (!gender) { setError("请选择性别(影响大运顺逆)。"); return; }
    if (!validBirthDate(birthDate) || birthDate < "1900-01-01") { setError("请选择有效的出生日期。"); return; }
    if (!/^\d{2}:\d{2}$/u.test(birthTime)) { setError("请填写出生时间(不确定可保持 0:00)。"); return; }
    if (!birthCityId) { setError("请选择出生城市,排盘需要经度做真太阳时校准。"); return; }
    const profile = readBasicProfile(email);
    writeBasicProfile(email, { ...profile, birthDate, birthTime, birthCityId });
    setError("");
    setPhase("analyzing");
    try {
      const response = await fetch("/api/myfate/personal-reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gender, birthDate, birthTime, birthCityId }),
      });
      if (response.status === 401) {
        window.location.replace(`/login?next=${encodeURIComponent(PAGE_PATH)}&from=${encodeURIComponent(PAGE_PATH)}`);
        return;
      }
      if (!response.ok) throw new Error("暂时无法生成个人解读,请稍后重试。");
      const body = await response.json() as { report: { id: string }; result: BaziReadingResult };
      if (!body.report?.id || body.result?.version !== 5) throw new Error("解读结果数据不完整。");
      const url = new URL(window.location.href);
      url.searchParams.set("report", body.report.id);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
      window.dispatchEvent(new CustomEvent("myfate-reports-updated"));
      setResult(body.result);
      setPhase("result");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "暂时无法生成个人解读。");
      setPhase("error");
    }
  }

  if (phase === "loading") {
    return <StateShell title="正在读取你的资料" detail="马上为你准备个人解读。" />;
  }
  if (phase === "analyzing") {
    return <StateShell title="正在排盘并生成解读" detail="系统正在按真太阳时排盘,并撰写八大板块解读,大约需要一分钟。" />;
  }
  if (phase === "error") {
    return <StateShell icon="!" title="这次解读暂时没有完成" detail={error} action={<button className="mf-primary-button" type="button" onClick={() => setPhase("form")}>重新填写</button>} />;
  }
  if (phase === "result" && result) {
    return (
      <main className="mf-result-main">
        <MyfateBaziResult result={result} actions={<button className="mf-primary-button" type="button" onClick={() => setPhase("form")}>重新排盘</button>} />
      </main>
    );
  }
  return (
    <main className="mf-question-main">
      <section className="mf-question-card mf-profile-question-card">
        <span className="mf-question-eyebrow">开始解读前</span>
        <h1>输入你的出生信息</h1>
        <p><strong>系统将按真太阳时为你排四柱八字,并生成八大板块个人解读。</strong>出生时间不确定可保持默认 0:00,出生城市必填。</p>
        <div className="mf-profile-question-fields">
          <div className="mf-bazi-gender" role="radiogroup" aria-label="性别">
            <button type="button" className={gender === "male" ? "is-active" : ""} onClick={() => { setGender("male"); setError(""); }}>男(乾造)</button>
            <button type="button" className={gender === "female" ? "is-active" : ""} onClick={() => { setGender("female"); setError(""); }}>女(坤造)</button>
          </div>
          <label className="mf-profile-field">
            <span>出生日期</span>
            <input type="date" min="1900-01-01" max={today} value={birthDate} onChange={(event) => { setBirthDate(event.target.value); setError(""); }} />
          </label>
          <label className="mf-profile-field">
            <span>出生时间</span>
            <input type="time" value={birthTime} onChange={(event) => { setBirthTime(event.target.value); setError(""); }} />
            <small>默认 0:00;越精确时柱越准,不确定可保持默认。</small>
          </label>
          <label className="mf-profile-field">
            <span>出生城市(必填)</span>
            <select value={birthCityId} onChange={(event) => { setBirthCityId(event.target.value); setError(""); }}>
              <option value="">请选择出生城市</option>
              {vedicCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
            <small>用于经度修正换算真太阳时,列表未收录的城市请选择临近城市。</small>
          </label>
        </div>
        <div className="mf-report-login-error" role="alert">{error}</div>
        <div className="mf-question-nav">
          <a className="mf-text-button" href="/home/relationship-test">← 返回明星合盘</a>
          <button className="mf-primary-button" type="button" onClick={() => void createReading()}>查看个人解读 <span>→</span></button>
        </div>
      </section>
    </main>
  );
}

function StateShell({ title, detail, action, icon = "✦" }: { title: string; detail: string; action?: React.ReactNode; icon?: string }) {
  return (
    <main className="mf-result-main">
      <div className="mf-report-detail-state mf-ai-generation-state">
        <span>{icon}</span><h1>{title}</h1><p>{detail}</p>
        {icon === "✦" ? <div className="mf-report-generation-progress" role="progressbar" aria-label="分析中"><i /></div> : null}
        {action}
      </div>
    </main>
  );
}
