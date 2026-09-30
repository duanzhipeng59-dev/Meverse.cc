"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import type { StarProfile } from "./myfate-data";
import MyfateFormulaResult from "./myfate-formula-result";
import { readBasicProfile, validBirthDate, writeBasicProfile } from "./myfate-progressive-profile";
import type { FormulaTestResult } from "./myfate-generated-test-types";
import type { StarVedicSummary } from "./myfate-stars-server";
import { vedicSignZh } from "./myfate-vedic-types";

export default function MyfateGeneratedTest({ star, workspace = false, vedicSummary = null }: { star: StarProfile; workspace?: boolean; vedicSummary?: StarVedicSummary | null }) {
  const { status, email } = useAuth();
  const started = useRef(false);
  const [personName, setPersonName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthHour, setBirthHour] = useState("");
  const [birthMinute, setBirthMinute] = useState("");
  const [birthProvinceCode, setBirthProvinceCode] = useState("");
  const [birthCityCode, setBirthCityCode] = useState("");
  const [birthDistrictCode, setBirthDistrictCode] = useState("");
  const [provinceOptions, setProvinceOptions] = useState<Array<{ code: string; name: string }>>([]);
  const [cityOptions, setCityOptions] = useState<Array<{ code: string; name: string }>>([]);
  const [districtOptions, setDistrictOptions] = useState<Array<{ code: string; name: string }>>([]);
  const [result, setResult] = useState<FormulaTestResult | null>(null);
  const [phase, setPhase] = useState<"loading" | "profile" | "analyzing" | "result" | "error">("loading");
  const [error, setError] = useState("");
  const [hasSavedProfile, setHasSavedProfile] = useState(false);
  const MUNICIPALITIES = new Set(["110000", "120000", "310000", "500000"]);
  const DEFAULT_PROVINCE = "110000";
  const DEFAULT_DISTRICT = "110101";

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1900 + 1 }, (_, index) => String(currentYear - index)).reverse();
  const monthOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
  const daysInMonth = birthYear && birthMonth ? new Date(Number(birthYear), Number(birthMonth), 0).getDate() : 31;
  const dayOptions = Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, "0"));
  const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
  const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
  const birthDate = birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth}-${birthDay}` : "";
  const birthTime = `${birthHour || "00"}:${birthMinute || "00"}`;

  async function fetchChildren(code: string) {
    return fetch(`/api/myfate/china-areas?code=${code}`).then(r => r.json() as Promise<{ children?: Array<{ code: string; name: string }> }>).then(d => d.children ?? []).catch(() => [] as Array<{ code: string; name: string }>);
  }

  async function chooseProvince(code: string) {
    setBirthProvinceCode(code);
    setBirthCityCode("");
    setBirthDistrictCode("");
    setCityOptions([]);
    setDistrictOptions([]);
    setError("");
    if (!code) return;
    const children = await fetchChildren(code);
    if (MUNICIPALITIES.has(code)) {
      const provName = provinceOptions.find(p => p.code === code)?.name ?? "";
      setCityOptions([{ code, name: provName }]);
      setBirthCityCode(code);
      setDistrictOptions(children);
      setBirthDistrictCode(children[0]?.code ?? "");
    } else {
      setCityOptions(children);
    }
  }

  async function chooseCity(code: string) {
    setBirthCityCode(code);
    setBirthDistrictCode("");
    setDistrictOptions([]);
    setError("");
    if (!code) return;
    if (MUNICIPALITIES.has(code) || code === birthProvinceCode) {
      setBirthDistrictCode(districtOptions[0]?.code ?? "");
      return;
    }
    const districts = await fetchChildren(code);
    setDistrictOptions(districts);
    if (!districts.length) setBirthDistrictCode(code);
  }

  function chooseYear(value: string) {
    setBirthYear(value); setError("");
    const dim = value && birthMonth ? new Date(Number(value), Number(birthMonth), 0).getDate() : 31;
    if (birthDay && Number(birthDay) > dim) setBirthDay(String(dim).padStart(2, "0"));
  }

  function chooseMonth(value: string) {
    setBirthMonth(value); setError("");
    const dim = birthYear && value ? new Date(Number(birthYear), Number(value), 0).getDate() : 31;
    if (birthDay && Number(birthDay) > dim) setBirthDay(String(dim).padStart(2, "0"));
  }

  useEffect(() => {
    if (status === "loading" || started.current) return;
    if (status === "anonymous") {
      started.current = true;
      const next = `/home/relationship-test/${star.id}/test`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/relationship-test/${star.id}`)}`);
      return;
    }
    started.current = true;
    const existingReportId = new URLSearchParams(window.location.search).get("report");
    if (existingReportId) {
      window.location.replace(`/home/relationship-test/${encodeURIComponent(existingReportId)}`);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const birth = params.get("birth");
    const city = params.get("city");
    const profile = readBasicProfile(email);
    setPersonName(profile.nickname || "");
    let prefilled = false;
    if (birth && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(birth)) {
      const [y, m, d] = birth.slice(0, 10).split("-");
      setBirthYear(y); setBirthMonth(m); setBirthDay(d);
      setBirthHour(birth.slice(11, 13));
      setBirthMinute(birth.slice(14));
      prefilled = true;
    } else if (profile.birthDate) {
      const [y, m, d] = profile.birthDate.split("-");
      setBirthYear(y); setBirthMonth(m); setBirthDay(d);
      setBirthHour((profile.birthTime || "00:00").slice(0, 2));
      setBirthMinute((profile.birthTime || "00:00").slice(3));
      prefilled = true;
    }
    setHasSavedProfile(prefilled);
    if (city && /^\d{6}$/u.test(city)) {
      setBirthProvinceCode(""); // loaded below via area chain
    }
    setPhase("profile");
    // area chain: default Beijing or restore profile/param codes
    const district = city && /^\d{6}$/u.test(city) ? city : readBasicProfile(email).birthDistrictCode || "110101";
    (async () => {
      const provinces = await fetch("/api/myfate/china-areas").then(r => r.json() as Promise<{ children?: Array<{ code: string; name: string }> }>).then(d => d.children ?? []).catch(() => [] as Array<{ code: string; name: string }>);
      setProvinceOptions(provinces);
      // find province containing district
      let found: { province: string; city: string; district: string } | undefined;
      for (const prov of provinces) {
        const children = await fetchChildren(prov.code);
        if (MUNICIPALITIES.has(prov.code)) {
          if (children.some(item => item.code === district)) { found = { province: prov.code, city: prov.code, district }; setCityOptions([{ code: prov.code, name: prov.name }]); setDistrictOptions(children); break; }
          continue;
        }
        for (const c of children) {
          const subs = await fetchChildren(c.code);
          if (subs.some(item => item.code === district)) { found = { province: prov.code, city: c.code, district }; setCityOptions(children); setDistrictOptions(subs); break; }
        }
        if (found) break;
      }
      if (found) {
        setBirthProvinceCode(found.province);
        setBirthCityCode(found.city);
        setBirthDistrictCode(found.district);
      } else {
        // fallback Beijing/Dongcheng
        setBirthProvinceCode(DEFAULT_PROVINCE);
        const children = await fetchChildren(DEFAULT_PROVINCE);
        setCityOptions([{ code: DEFAULT_PROVINCE, name: "北京市" }]);
        setBirthCityCode(DEFAULT_PROVINCE);
        setDistrictOptions(children);
        setBirthDistrictCode(DEFAULT_DISTRICT);
      }
    })();
  }, [email, star.id, status]);

  function validateBirth() {
    if (!validBirthDate(birthDate) || birthDate < "1900-01-01") {
      setError("请选择有效的出生日期。");
      return false;
    }
    if (!/^\d{2}:\d{2}$/u.test(birthTime)) {
      setError("请填写出生时间（不确定可保持 00:00）。");
      return false;
    }
    if (!birthDistrictCode) {
      setError("请选择出生地点（省/市/区），合盘需要地理位置确定上升星座。");
      return false;
    }
    setError("");
    return true;
  }

  async function createCompositeAnalysis() {
    if (!validateBirth()) return;
    const profile = readBasicProfile(email);
    writeBasicProfile(email, { ...profile, nickname: personName.trim() || profile.nickname, birthDate, birthTime, birthCityId: profile.birthCityId, birthProvinceCode, birthCityCode, birthDistrictCode });
    setError("");
    setPhase("analyzing");
    try {
      const response = await fetch("/api/myfate/composite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starId: star.id, birthDate, birthTime, birthCityId: birthDistrictCode }),
      });
      if (response.status === 401) {
        const next = `/home/relationship-test/${star.id}/test`;
        window.location.replace(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/relationship-test/${star.id}`)}`);
        return;
      }
      if (response.status === 402) {
        setError("报告额度不足：请先在订阅升级页购买报告次数（合盘与个人解读通用）。");
        setTimeout(() => { window.location.href = "/home/upgrade"; }, 1800);
        return;
      }
      if (!response.ok) throw new Error("暂时无法生成合盘分析，请稍后重试。");
      const body = await response.json() as { report: { id: string }; result: FormulaTestResult };
      if (!body.report?.id || body.result?.version !== 4) throw new Error("合盘结果数据不完整。");
      const url = new URL(window.location.href);
      url.searchParams.set("report", body.report.id);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
      window.dispatchEvent(new CustomEvent("myfate-reports-updated"));
      setResult(body.result);
      setPhase("result");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "暂时无法生成合盘分析。");
      setPhase("error");
    }
  }

  if (phase === "loading") {
    return <StateShell star={star} workspace={workspace} title="正在读取你的资料" detail="马上为你准备吠陀合盘。" />;
  }
  if (phase === "profile") {
    return (
      <div className={workspace ? "mf-test-page mf-workspace-test" : "mf-test-page"}>
        <TestHeader star={star} workspace={workspace} label="吠陀合盘资料" />
        <main className="mf-bz-form">
          <header className="mf-bz-form-head">
            <span>明星合盘</span>
            <h1>确认你们的出生信息</h1>
            <p>TA 的信息已自动就绪；你的出生信息如已保存会自动填入，也可手动修改。</p>
          </header>
          <div className="mf-bz-duo-form">
            <section className="mf-bz-duo-info">
              <header><span>TA · 明星（已自动就绪）</span></header>
              <img src={star.portraitSrc} alt="" />
              <h2>{star.name}</h2>
              <p className="mf-bz-duo-role">{star.role}</p>
              <small>出生日期 {star.birthDate}</small>
              {vedicSummary ? (
                <dl>
                  <div><dt>上升</dt><dd>{vedicSignZh[vedicSummary.lagna] ?? vedicSummary.lagna} · {vedicSummary.lagnaNakshatra}</dd></div>
                  <div><dt>月亮</dt><dd>{vedicSignZh[vedicSummary.moonSign] ?? vedicSummary.moonSign} · {vedicSummary.moonNakshatra}</dd></div>
                  <div><dt>太阳</dt><dd>{vedicSignZh[vedicSummary.sunSign] ?? vedicSummary.sunSign}</dd></div>
                </dl>
              ) : null}
            </section>
            <section className="mf-bz-duo-info is-you">
              <header><span>你 · 出生信息{hasSavedProfile ? "（已自动填入）" : "（请手动填写）"}</span></header>
              <label className="mf-bz-field">
                <span>姓名（可选）</span>
                <input type="text" maxLength={20} placeholder="" value={personName} onChange={(event) => { setPersonName(event.target.value); setError(""); }} />
              </label>
              <div className="mf-bz-field">
                <span>出生日期</span>
                <div className="mf-bz-area">
                  <select value={birthYear} onChange={(event) => chooseYear(event.target.value)}>
                    <option value="">年</option>
                    {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <select value={birthMonth} onChange={(event) => chooseMonth(event.target.value)}>
                    <option value="">月</option>
                    {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                  <select value={birthDay} onChange={(event) => { setBirthDay(event.target.value); setError(""); }}>
                    <option value="">日</option>
                    {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
              </div>
              <div className="mf-bz-field">
                <span>出生时间</span>
                <div className="mf-bz-time">
                  <select value={birthHour} onChange={(event) => { setBirthHour(event.target.value); setError(""); }}>
                    <option value="">时</option>
                    {hourOptions.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                  </select>
                  <select value={birthMinute} onChange={(event) => { setBirthMinute(event.target.value); setError(""); }}>
                    <option value="">分</option>
                    {minuteOptions.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                  </select>
                </div>
              </div>
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
              <small className="mf-bz-hint">出生时间不确定可保持默认 00:00。</small>
              <div className="mf-report-login-error" role="alert">{error}</div>
              <button className="mf-bz-btn" type="button" onClick={() => { if (!validateBirth()) return; void createCompositeAnalysis(); }}>生成合盘分析 <span aria-hidden="true">→</span></button>
            </section>
          </div>
          <div className="mf-bz-form-grid" hidden>
            <section className="mf-bz-form-card">
              <div className="mf-bz-field">
                <span>出生日期</span>
                <div className="mf-bz-area">
                  <select value={birthYear} onChange={(event) => chooseYear(event.target.value)}>
                    <option value="">年</option>
                    {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <select value={birthMonth} onChange={(event) => chooseMonth(event.target.value)}>
                    <option value="">月</option>
                    {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                  <select value={birthDay} onChange={(event) => { setBirthDay(event.target.value); setError(""); }}>
                    <option value="">日</option>
                    {dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
              </div>
              <div className="mf-bz-field">
                <span>出生时间</span>
                <div className="mf-bz-time">
                  <select value={birthHour} onChange={(event) => { setBirthHour(event.target.value); setError(""); }}>
                    <option value="">时</option>
                    {hourOptions.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                  </select>
                  <select value={birthMinute} onChange={(event) => { setBirthMinute(event.target.value); setError(""); }}>
                    <option value="">分</option>
                    {minuteOptions.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                  </select>
                </div>
              </div>
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
            </section>
            <aside className="mf-bz-duo-side" hidden>
              <section className="mf-bz-duo-card">
                <img src={star.portraitSrc} alt="" />
                <div>
                  <span>TA · 明星</span>
                  <h2>{star.name}</h2>
                  <p>{star.role}</p>
                  <small>出生日期 {star.birthDate} · {star.matchCount} 人已合盘</small>
                </div>
              </section>
              {vedicSummary ? (
                <section className="mf-bz-side-block">
                  <span>TA 的本命星盘（已排盘）</span>
                  <dl>
                    <div><dt>上升</dt><dd>{vedicSignZh[vedicSummary.lagna] ?? vedicSummary.lagna} · {vedicSummary.lagnaNakshatra}</dd></div>
                    <div><dt>月亮</dt><dd>{vedicSignZh[vedicSummary.moonSign] ?? vedicSummary.moonSign} · {vedicSummary.moonNakshatra} p{vedicSummary.moonPada}</dd></div>
                    <div><dt>太阳</dt><dd>{vedicSignZh[vedicSummary.sunSign] ?? vedicSummary.sunSign}</dd></div>
                  </dl>
                </section>
              ) : null}
              <section className="mf-bz-side-block">
                <span>报告将包含</span>
                <ul>
                  <li>六维关系矩阵（附证据与置信度）</li>
                  <li>双向宫位互动表</li>
                  <li>Ashtakoota 月宿八项筛查</li>
                  <li>Dasha 时机观察</li>
                </ul>
              </section>
              <p className="mf-bz-duo-side-note">基于 Swiss Ephemeris 天文历表与真实跨盘计算生成，非随机结论。</p>
            </aside>
          </div>
          <Link className="mf-bz-btn-ghost" style={{ justifySelf: "start" }} href={workspace ? `/home/relationship-test/${star.id}` : `/celebrity/${star.id}`}>← 返回详情</Link>
        </main>
      </div>
    );
  }
  if (phase === "analyzing") {
    return <StateShell star={star} workspace={workspace} title="正在生成合盘分析" detail="系统正在计算双方星盘的跨盘结构，可能需要一两分钟。" />;
  }
  if (phase === "error") {
    return <StateShell star={star} workspace={workspace} icon="!" title="这次合盘暂时没有完成" detail={error} action={<button className="mf-primary-button" type="button" onClick={() => setPhase("profile")}>重新填写</button>} />;
  }
  if (phase === "result" && result) {
    return (
      <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}>
        <TestHeader star={star} workspace={workspace} label="吠陀合盘分析" />
        <main>
          <div className="mf-bz-next-cta">
            <span>想知道和谁最配？</span>
            <div>
              <Link className="mf-bz-btn" href={`/home/relationship-test/rank?birth=${encodeURIComponent(`${birthDate} ${birthTime}`)}&city=${encodeURIComponent(birthDistrictCode)}`}>查看我的偶像适配榜</Link>
              <Link className="mf-bz-btn-ghost" href="/home/relationship-test">换个偶像再测（出生信息已记住）</Link>
            </div>
          </div>
          <MyfateFormulaResult star={star} result={result} actions={<><Link className="mf-bz-btn-ghost" href="/home/reports">查看历史报告</Link><button className="mf-bz-btn" type="button" onClick={() => setPhase("profile")}>重新合盘</button></>} />
        </main>
      </div>
    );
  }
  return null;
}

function TestHeader({ star, workspace, label }: { star: StarProfile; workspace: boolean; label: string }) {
  return <header className="mf-test-header">{workspace ? <Link className="mf-back-link" href={`/home/relationship-test/${star.id}`}>← 返回详情</Link> : <Link className="mf-brand" href="/"><span className="mf-brand-mark">M</span><span>Myfate</span></Link>}<span>{label}</span><Link href={workspace ? "/home/relationship-test" : `/celebrity/${star.id}`}>退出</Link></header>;
}

function StateShell({ star, workspace, title, detail, action, icon = "✦" }: { star: StarProfile; workspace: boolean; title: string; detail: string; action?: React.ReactNode; icon?: string }) {
  return <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}><TestHeader star={star} workspace={workspace} label="吠陀合盘分析" /><main><div className="mf-report-detail-state mf-ai-generation-state"><span>{icon}</span><h1>{title}</h1><p>{detail}</p>{icon === "✦" ? <div className="mf-report-generation-progress" role="progressbar" aria-label="分析中"><i /></div> : null}{action}</div></main></div>;
}
