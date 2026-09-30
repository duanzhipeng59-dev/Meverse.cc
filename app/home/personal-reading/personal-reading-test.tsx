"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth-context";
import { vedicCities } from "../../myfate-cities";
import { readBasicProfile, validBirthDate, writeBasicProfile } from "../../myfate-progressive-profile";
import MyfateBaziResult, { BaziChartSections } from "../../myfate-bazi-result";
import { buildBaziChart, type BaziChart } from "../../myfate-bazi-engine";
import type { BaziReadingResult } from "../../myfate-bazi-types";

const PAGE_PATH = "/home/personal-reading";
const PENDING_GENDER_KEY = "myfate-bazi-pending-gender";

function redirectToLogin() {
  window.location.replace(`/login?next=${encodeURIComponent(PAGE_PATH)}&from=${encodeURIComponent(PAGE_PATH)}`);
}

export default function PersonalReadingTest() {
  const { status, email } = useAuth();
  const started = useRef(false);
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("00:00");
  const [birthCityId, setBirthCityId] = useState("");
  const [chart, setChart] = useState<BaziChart | null>(null);
  const [result, setResult] = useState<BaziReadingResult | null>(null);
  const [phase, setPhase] = useState<"loading" | "form" | "paipan" | "analyzing" | "result" | "error">("loading");
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (status === "loading" || started.current) return;
    started.current = true;
    const existingReportId = new URLSearchParams(window.location.search).get("report");
    if (existingReportId) {
      redirectToLogin();
      return;
    }
    // Login is only required to generate the AI reading; the chart itself
    // (排盘) is computed locally and open to anonymous visitors.
    const savedGender = window.sessionStorage.getItem(PENDING_GENDER_KEY);
    if (savedGender === "male" || savedGender === "female") setGender(savedGender);
    let profile = readBasicProfile(email);
    if (!profile.birthDate || !profile.birthCityId) {
      profile = { ...profile, ...readBasicProfile(null), ...(profile.birthDate ? { birthDate: profile.birthDate } : {}) };
    }
    setBirthDate(profile.birthDate);
    setBirthTime(profile.birthTime || "00:00");
    setBirthCityId(profile.birthCityId);
    setPhase("form");
  }, [email, status]);

  function validateForm() {
    if (!gender) { setError("请选择性别（影响大运顺逆）。"); return null; }
    if (!validBirthDate(birthDate) || birthDate < "1900-01-01") { setError("请选择有效的出生日期。"); return null; }
    if (!/^\d{2}:\d{2}$/u.test(birthTime)) { setError("请填写出生时间（不确定可保持 00:00）。"); return null; }
    if (!birthCityId) { setError("请选择出生城市，排盘需要经度做真太阳时校准。"); return null; }
    setError("");
    return true;
  }

  function paipan() {
    if (!validateForm()) return;
    const city = vedicCities.find((item) => item.id === birthCityId);
    if (!city) { setError("出生城市无效。"); return; }
    const profile = readBasicProfile(email);
    writeBasicProfile(email, { ...profile, birthDate, birthTime, birthCityId });
    setChart(buildBaziChart({ gender: gender as "male" | "female", birthDate, birthTime, city }));
    setPhase("paipan");
  }

  async function createReading() {
    if (!chart || !validateForm()) return;
    if (status === "anonymous") {
      window.sessionStorage.setItem(PENDING_GENDER_KEY, gender);
      redirectToLogin();
      return;
    }
    setPhase("analyzing");
    try {
      const response = await fetch("/api/myfate/personal-reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gender, birthDate, birthTime, birthCityId }),
      });
      if (response.status === 401) {
        window.sessionStorage.setItem(PENDING_GENDER_KEY, gender);
        redirectToLogin();
        return;
      }
      if (response.status === 402) {
        setError("报告额度不足：请先在订阅升级页购买报告次数（合盘与个人解读通用）。");
        setTimeout(() => { window.location.href = "/home/upgrade"; }, 1800);
        return;
      }
      if (!response.ok) throw new Error("暂时无法生成个人解读，请稍后重试。");
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
    return <StateShell title="正在生成解读" detail="排盘已完成,系统正在撰写八大板块解读,大约需要一分钟。" />;
  }
  if (phase === "error") {
    return <StateShell icon="!" title="这次解读暂时没有完成" detail={error} action={<button className="mf-primary-button" type="button" onClick={() => setPhase(chart ? "paipan" : "form")}>重试</button>} />;
  }
  if (phase === "result" && result) {
    return (
      <main className="mf-result-main">
        <MyfateBaziResult result={result} actions={<button className="mf-primary-button" type="button" onClick={() => { setResult(null); setChart(null); setPhase("form"); }}>重新排盘</button>} />
      </main>
    );
  }
  if (phase === "paipan" && chart) {
    return (
      <main className="mf-result-main">
        <div className="mf-formula-result mf-bazi-result">
          <BaziChartSections chart={chart} />
          <div className="mf-result-actions">
            <button className="mf-secondary-button" type="button" onClick={() => setPhase("form")}>← 修改信息</button>
            <button className="mf-primary-button" type="button" onClick={() => void createReading()}>生成解读 <span>→</span></button>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="mf-question-main">
      <section className="mf-question-card mf-profile-question-card">
        <span className="mf-question-eyebrow">开始解读前</span>
        <h1>输入你的出生信息</h1>
        <p><strong>系统将按真太阳时为你排四柱八字,再生成八大板块个人解读。</strong>出生时间不确定可保持默认 0:00,出生城市必填。</p>
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
            <small>默认 00:00；越精确时柱越准，不确定可保持默认。</small>
          </label>
          <label className="mf-profile-field">
            <span>出生城市(必填)</span>
            <select value={birthCityId} onChange={(event) => { setBirthCityId(event.target.value); setError(""); }}>
              <option value="">请选择出生城市</option>
              {vedicCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
            <small>用于经度修正换算真太阳时，列表未收录的城市请选择临近城市。</small>
          </label>
        </div>
        <div className="mf-report-login-error" role="alert">{error}</div>
        <div className="mf-question-nav">
          <button className="mf-primary-button" type="button" onClick={paipan}>排盘 <span>→</span></button>
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
