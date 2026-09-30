"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import type { StarProfile } from "./myfate-data";
import MyfateFormulaResult from "./myfate-formula-result";
import { readBasicProfile, validBirthDate, writeBasicProfile } from "./myfate-progressive-profile";
import { vedicCities } from "./myfate-cities";
import type { FormulaTestResult } from "./myfate-generated-test-types";

export default function MyfateGeneratedTest({ star, workspace = false }: { star: StarProfile; workspace?: boolean }) {
  const { status, email } = useAuth();
  const started = useRef(false);
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("00:00");
  const [birthCityId, setBirthCityId] = useState("");
  const [result, setResult] = useState<FormulaTestResult | null>(null);
  const [phase, setPhase] = useState<"loading" | "profile" | "analyzing" | "result" | "error">("loading");
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

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
    const profile = readBasicProfile(email);
    setBirthDate(profile.birthDate);
    setBirthTime(profile.birthTime || "00:00");
    setBirthCityId(profile.birthCityId);
    setPhase("profile");
  }, [email, star.id, status]);

  async function createCompositeAnalysis() {
    if (!validBirthDate(birthDate) || birthDate < "1900-01-01") {
      setError("请选择有效的出生日期。");
      return;
    }
    if (!/^\d{2}:\d{2}$/u.test(birthTime)) {
      setError("请填写出生时间（不确定可保持 00:00）。");
      return;
    }
    if (!birthCityId) {
      setError("请选择出生城市，合盘需要地理位置确定上升星座。");
      return;
    }
    const profile = readBasicProfile(email);
    writeBasicProfile(email, { ...profile, birthDate, birthTime, birthCityId });
    setError("");
    setPhase("analyzing");
    try {
      const response = await fetch("/api/myfate/composite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starId: star.id, birthDate, birthTime, birthCityId }),
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
            <h1>输入你的出生信息</h1>
            <p>系统将使用吠陀占星（Jyotish）为你与 {star.name} 生成完整合盘报告（六维关系矩阵）。</p>
          </header>
          <div className="mf-bz-form-grid">
            <section className="mf-bz-form-card">
              <label className="mf-bz-field">
                <span>出生日期</span>
                <input type="date" min="1900-01-01" max={today} value={birthDate} onChange={(event) => { setBirthDate(event.target.value); setError(""); }} />
              </label>
              <label className="mf-bz-field">
                <span>出生时间</span>
                <input type="time" value={birthTime} onChange={(event) => { setBirthTime(event.target.value); setError(""); }} />
              </label>
              <label className="mf-bz-field">
                <span>出生城市</span>
                <select value={birthCityId} onChange={(event) => { setBirthCityId(event.target.value); setError(""); }}>
                  <option value="">请选择城市</option>
                  {vedicCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
              </label>
              <small className="mf-bz-hint">出生时间不确定可保持默认 00:00；出生城市必填（确定地理坐标与时区）。</small>
              <div className="mf-report-login-error" role="alert">{error}</div>
              <button className="mf-bz-btn" type="button" onClick={() => void createCompositeAnalysis()}>查看合盘分析 <span aria-hidden="true">→</span></button>
            </section>
            <aside className="mf-bz-include">
              <h2>这份合盘包含</h2>
              <ul>
                <li><i aria-hidden="true">盘</i><div><b>六维关系矩阵</b><p>情绪安全、吸引亲密、沟通修复等六个维度，档位判断附证据与置信度。</p></div></li>
                <li><i aria-hidden="true">宫</i><div><b>双向宫位互动</b><p>双方行星分别落入对方宫位的结构，是互动方式的主要证据。</p></div></li>
                <li><i aria-hidden="true">宿</i><div><b>Ashtakoota 月宿筛查</b><p>传统月宿配对八项参考，结合关系类型结论呈现。</p></div></li>
                <li><i aria-hidden="true">时</i><div><b>时机观察</b><p>双方 Dasha 序列的共振窗口提示。</p></div></li>
              </ul>
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
        <main><MyfateFormulaResult star={star} result={result} actions={<><Link className="mf-secondary-button" href="/home/reports">查看历史报告</Link><button className="mf-primary-button" type="button" onClick={() => setPhase("profile")}>重新合盘</button></>} /></main>
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
