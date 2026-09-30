"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth-context";
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
  const [birthProvinceCode, setBirthProvinceCode] = useState("");
  const [birthCityCode, setBirthCityCode] = useState("");
  const [birthDistrictCode, setBirthDistrictCode] = useState("");
  const [provinceOptions, setProvinceOptions] = useState<Array<{ code: string; name: string }>>([]);
  const [cityOptions, setCityOptions] = useState<Array<{ code: string; name: string }>>([]);
  const [districtOptions, setDistrictOptions] = useState<Array<{ code: string; name: string }>>([]);
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
    const province = profile.birthProvinceCode;
    const city = profile.birthCityCode;
    const district = profile.birthDistrictCode;
    (async () => {
      const provinces = await fetch("/api/myfate/china-areas").then(r => r.json() as Promise<{ children?: Array<{ code: string; name: string }> }>).then(d => d.children ?? []).catch(() => [] as Array<{ code: string; name: string }>);
      setProvinceOptions(provinces);
      if (province && provinces.some(p => p.code === province)) {
        setBirthProvinceCode(province);
        const cities = await fetch(`/api/myfate/china-areas?code=${province}`).then(r => r.json() as Promise<{ children?: Array<{ code: string; name: string }> }>).then(d => d.children ?? []).catch(() => [] as Array<{ code: string; name: string }>);
        setCityOptions(cities);
        if (city && cities.some(c => c.code === city)) {
          setBirthCityCode(city);
          const districts = await fetch(`/api/myfate/china-areas?code=${city}`).then(r => r.json() as Promise<{ children?: Array<{ code: string; name: string }> }>).then(d => d.children ?? []).catch(() => [] as Array<{ code: string; name: string }>);
          setDistrictOptions(districts);
          if (district && districts.some(d => d.code === district)) setBirthDistrictCode(district);
        }
      }
    })();
    setPhase("form");
  }, [email, status]);

  async function chooseProvince(code: string) {
    setBirthProvinceCode(code);
    setBirthCityCode("");
    setBirthDistrictCode("");
    setCityOptions([]);
    setDistrictOptions([]);
    setError("");
    if (!code) return;
    const cities = await fetch(`/api/myfate/china-areas?code=${code}`).then(r => r.json() as Promise<{ children?: Array<{ code: string; name: string }> }>).then(d => d.children ?? []).catch(() => [] as Array<{ code: string; name: string }>);
    setCityOptions(cities);
  }

  async function chooseCity(code: string) {
    setBirthCityCode(code);
    setBirthDistrictCode("");
    setDistrictOptions([]);
    setError("");
    if (!code) return;
    const districts = await fetch(`/api/myfate/china-areas?code=${code}`).then(r => r.json() as Promise<{ children?: Array<{ code: string; name: string }> }>).then(d => d.children ?? []).catch(() => [] as Array<{ code: string; name: string }>);
    setDistrictOptions(districts);
    if (!districts.length) setBirthDistrictCode(code); // municipality leaf: city is the finest level
  }

  function validateForm() {
    if (!gender) { setError("请选择性别（影响大运顺逆）。"); return null; }
    if (!validBirthDate(birthDate) || birthDate < "1900-01-01") { setError("请选择有效的出生日期。"); return null; }
    if (!/^\d{2}:\d{2}$/u.test(birthTime)) { setError("请填写出生时间（不确定可保持 00:00）。"); return null; }
    if (!birthDistrictCode) { setError("请选择出生地点（省/市/区）。"); return null; }
    setError("");
    return true;
  }

  async function paipan() {
    if (!validateForm()) return;
    if (status === "anonymous") {
      window.sessionStorage.setItem(PENDING_GENDER_KEY, gender);
      redirectToLogin();
      return;
    }
    const area = await fetch(`/api/myfate/china-areas?resolve=${birthDistrictCode}`).then(r => r.json() as Promise<{ code?: string; name?: string; lat?: number; lon?: number }>).catch(() => null);
    if (!area?.name || typeof area.lon !== "number") { setError("出生地点无效，请重新选择。"); return; }
    const city = { id: area.code ?? birthDistrictCode, name: area.name!, lat: area.lat!, lon: area.lon!, tz: "Asia/Shanghai" };
    const profile = readBasicProfile(email);
    writeBasicProfile(email, { ...profile, birthDate, birthTime, birthCityId: profile.birthCityId, birthProvinceCode, birthCityCode, birthDistrictCode });
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
        body: JSON.stringify({ gender, birthDate, birthTime, birthDistrictCode }),
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
    <main className="mf-bz-form">
      <header className="mf-bz-form-head">
        <span>个人解读</span>
        <h1>输入你的出生信息</h1>
        <p>系统将按真太阳时排出四柱八字，并生成八大板块个人解读。</p>
      </header>
      <div className="mf-bz-form-grid">
        <section className="mf-bz-form-card">
          <label className="mf-bz-field">
            <span>出生日期</span>
            <input type="date" min="1900-01-01" max={today} value={birthDate} onChange={(event) => { setBirthDate(event.target.value); setError(""); }} />
          </label>
          <label className="mf-bz-field">
            <span>出生时间（可选）</span>
            <input type="time" value={birthTime} onChange={(event) => { setBirthTime(event.target.value); setError(""); }} />
          </label>
          <div className="mf-bz-field">
            <span>出生地点</span>
            <div className="mf-bz-area">
              <select value={birthProvinceCode} onChange={(event) => void chooseProvince(event.target.value)}>
                <option value="">省</option>
                {provinceOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
              <select value={birthCityCode} onChange={(event) => void chooseCity(event.target.value)} disabled={!birthProvinceCode}>
                <option value="">市</option>
                {cityOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
              <select value={birthDistrictCode} onChange={(event) => { setBirthDistrictCode(event.target.value); setError(""); }} disabled={!birthCityCode}>
                <option value="">区/县</option>
                {districtOptions.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
              </select>
            </div>
          </div>
          <fieldset className="mf-bz-field">
            <span>性别</span>
            <div className="mf-bz-gender" role="radiogroup" aria-label="性别">
              <button type="button" className={gender === "male" ? "is-active" : ""} onClick={() => { setGender("male"); setError(""); }}><i aria-hidden="true" />男</button>
              <button type="button" className={gender === "female" ? "is-active" : ""} onClick={() => { setGender("female"); setError(""); }}><i aria-hidden="true" />女</button>
            </div>
          </fieldset>
          <small className="mf-bz-hint">出生时间不确定可保持默认 0:00，出生地点需选到区/县（用于真太阳时校准）。</small>
          <div className="mf-report-login-error" role="alert">{error}</div>
          <button className="mf-bz-submit" type="button" onClick={() => void paipan()}>开始排盘 <span aria-hidden="true">→</span></button>
        </section>
        <aside className="mf-bz-include">
          <h2>这份解读包含</h2>
          <ul>
            <li><i aria-hidden="true">卦</i><div><b>四柱八字</b><p>按真太阳时排盘，呈现你的八字命盘与基础格局。</p></div></li>
            <li><i aria-hidden="true">行</i><div><b>五行结构</b><p>分析五行旺衰与生克关系，了解你的先天能量结构。</p></div></li>
            <li><i aria-hidden="true">运</i><div><b>大运时间轴</b><p>呈现你一生的大运走势，把握不同阶段的关键主题。</p></div></li>
            <li><i aria-hidden="true">解</i><div><b>八大板块解读</b><p>从多个维度深入解析你的性格、优势、机遇与人生方向。</p></div></li>
          </ul>
        </aside>
      </div>
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
