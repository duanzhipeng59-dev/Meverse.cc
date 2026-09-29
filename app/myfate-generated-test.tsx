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
  const [birthTime, setBirthTime] = useState("");
  const [birthCityId, setBirthCityId] = useState("");
  const [result, setResult] = useState<FormulaTestResult | null>(null);
  const [vedicAvailable, setVedicAvailable] = useState(false);
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
      window.location.replace(`/home/reports/${encodeURIComponent(existingReportId)}`);
      return;
    }
    const profile = readBasicProfile(email);
    setBirthDate(profile.birthDate);
    setBirthTime(profile.birthTime);
    setBirthCityId(profile.birthCityId);
    setPhase("profile");
  }, [email, star.id, status]);

  async function createCompositeAnalysis() {
    if (!validBirthDate(birthDate) || birthDate < "1900-01-01") {
      setError("请选择有效的出生日期。");
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
        body: JSON.stringify({ starId: star.id, birthDate, ...(birthTime ? { birthTime } : {}), ...(birthTime && birthCityId ? { birthCityId } : {}) }),
      });
      if (response.status === 401) {
        const next = `/home/relationship-test/${star.id}/test`;
        window.location.replace(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/relationship-test/${star.id}`)}`);
        return;
      }
      if (!response.ok) throw new Error("暂时无法生成合盘分析，请稍后重试。");
      const body = await response.json() as { report: { id: string }; result: FormulaTestResult; vedicAvailable?: boolean };
      if (!body.report?.id || (body.result?.version !== 3 && body.result?.version !== 4)) throw new Error("合盘结果数据不完整。");
      setVedicAvailable(body.vedicAvailable === true);
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
    return <StateShell star={star} workspace={workspace} title="正在读取你的资料" detail="马上为你准备三柱合盘。" />;
  }
  if (phase === "profile") {
    return (
      <div className={workspace ? "mf-test-page mf-workspace-test" : "mf-test-page"}>
        <TestHeader star={star} workspace={workspace} label="三柱合盘资料" />
        <main className="mf-question-main">
          <section className="mf-question-card mf-profile-question-card">
            <span className="mf-question-eyebrow">开始合盘前</span>
            <h1>输入你的出生信息</h1>
            <p><strong>填写出生时间与出生城市，解锁完整吠陀合盘报告（六维关系矩阵）。</strong>不填时辰将只做简化的三柱合盘。</p>
            <div className="mf-profile-question-fields">
              <label className="mf-profile-field">
                <span>出生日期</span>
                <input type="date" min="1900-01-01" max={today} value={birthDate} onChange={(event) => { setBirthDate(event.target.value); setError(""); }} />
                <small>日期会自动保存到这台设备的个人中心。</small>
              </label>
              <label className="mf-profile-field">
                <span>出生时间（强烈建议填写）</span>
                <input type="time" value={birthTime} onChange={(event) => { setBirthTime(event.target.value); setError(""); }} />
                <small>尽量精确到分钟；留空将只做简化的三柱合盘，看不到完整吠陀报告。</small>
              </label>
              <label className="mf-profile-field">
                <span>出生城市（填写时间后生效）</span>
                <select value={birthCityId} onChange={(event) => { setBirthCityId(event.target.value); setError(""); }}>
                  <option value="">请选择出生城市</option>
                  {vedicCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
                <small>用于确定地理坐标与时区，列表未收录的城市请选择临近城市。</small>
              </label>
            </div>
            <div className="mf-report-login-error" role="alert">{error}</div>
            <div className="mf-question-nav">
              <Link className="mf-text-button" href={workspace ? `/home/relationship-test/${star.id}` : `/celebrity/${star.id}`}>← 返回详情</Link>
              <button className="mf-primary-button" type="button" onClick={() => void createCompositeAnalysis()}>查看合盘分析 <span>→</span></button>
            </div>
          </section>
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
        <TestHeader star={star} workspace={workspace} label="三柱合盘分析" />
        <main>
          {result.version === 3 && vedicAvailable ? (
            <div className="mf-vedic-upsell">
              <strong>这是简化版三柱合盘</strong>
              <span>你没有填写出生时间。填写出生时间与城市后重新合盘，可查看完整吠陀报告（六维关系矩阵、双向宫位互动、Ashtakoota）。</span>
              <button className="mf-primary-button" type="button" onClick={() => setPhase("profile")}>填写时间重新合盘</button>
            </div>
          ) : null}
          <MyfateFormulaResult star={star} result={result} actions={<><Link className="mf-secondary-button" href="/home/reports">查看历史报告</Link><button className="mf-primary-button" type="button" onClick={() => setPhase("profile")}>重新合盘</button></>} />
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
  return <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}><TestHeader star={star} workspace={workspace} label="三柱合盘分析" /><main><div className="mf-report-detail-state mf-ai-generation-state"><span>{icon}</span><h1>{title}</h1><p>{detail}</p>{icon === "✦" ? <div className="mf-report-generation-progress" role="progressbar" aria-label="分析中"><i /></div> : null}{action}</div></main></div>;
}
