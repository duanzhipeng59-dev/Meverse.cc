"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-context";
import type { StarProfile } from "./myfate-data";
import MyfateFormulaResult from "./myfate-formula-result";
import type { ThreePillarCompositeResult } from "./myfate-generated-test-types";
import { readBasicProfile, validBirthDate, writeBasicProfile } from "./myfate-progressive-profile";

export default function MyfateGeneratedTest({ star, workspace = false }: { star: StarProfile; workspace?: boolean }) {
  const { status, email } = useAuth();
  const started = useRef(false);
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<ThreePillarCompositeResult | null>(null);
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
    setPhase("profile");
  }, [email, star.id, status]);

  async function createCompositeAnalysis() {
    if (!validBirthDate(birthDate) || birthDate < "1900-01-01") {
      setError("请选择有效的出生日期。");
      return;
    }
    const profile = readBasicProfile(email);
    writeBasicProfile(email, { ...profile, birthDate });
    setError("");
    setPhase("analyzing");
    try {
      const response = await fetch("/api/myfate/composite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starId: star.id, birthDate }),
      });
      if (response.status === 401) {
        const next = `/home/relationship-test/${star.id}/test`;
        window.location.replace(`/login?next=${encodeURIComponent(next)}&from=${encodeURIComponent(`/home/relationship-test/${star.id}`)}`);
        return;
      }
      if (!response.ok) throw new Error("暂时无法生成合盘分析，请稍后重试。");
      const body = await response.json() as { report: { id: string }; result: ThreePillarCompositeResult };
      if (!body.report?.id || body.result?.version !== 3) throw new Error("合盘结果数据不完整。");
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
            <h1>输入你的出生日期</h1>
            <p>系统会用你的年、月、日三柱与 {star.name} 的三柱直接合盘。明星没有出生时辰，因此不会补算时柱，也不会生成完整八字或紫微命盘。</p>
            <div className="mf-profile-question-fields">
              <label className="mf-profile-field">
                <span>出生日期</span>
                <input type="date" min="1900-01-01" max={today} value={birthDate} onChange={(event) => { setBirthDate(event.target.value); setError(""); }} />
                <small>日期会自动保存到这台设备的个人中心。</small>
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
    return <StateShell star={star} workspace={workspace} title="正在生成三柱合盘" detail="系统正在计算双方年柱、月柱与日柱的关系结构。" />;
  }
  if (phase === "error") {
    return <StateShell star={star} workspace={workspace} icon="!" title="这次合盘暂时没有完成" detail={error} action={<button className="mf-primary-button" type="button" onClick={() => setPhase("profile")}>重新填写</button>} />;
  }
  if (phase === "result" && result) {
    return (
      <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}>
        <TestHeader star={star} workspace={workspace} label="三柱合盘分析" />
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
  return <div className={workspace ? "mf-result-page mf-workspace-test" : "mf-result-page"}><TestHeader star={star} workspace={workspace} label="三柱合盘分析" /><main><div className="mf-report-detail-state mf-ai-generation-state"><span>{icon}</span><h1>{title}</h1><p>{detail}</p>{icon === "✦" ? <div className="mf-report-generation-progress" role="progressbar" aria-label="分析中"><i /></div> : null}{action}</div></main></div>;
}
