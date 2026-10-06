"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { validBirthDate } from "../../../myfate-progressive-profile";
import { vedicCities } from "../../../myfate-cities";
import { portraitImage } from "../../../myfate-image";

type RankItem = {
  starId: string;
  name: string;
  portraitSrc: string;
  role: string;
  score: number;
  resonance: number;
};

export default function RankWorkspace({ initialBirth, initialCity }: { initialBirth?: string; initialCity?: string }) {
  const [birthDate, setBirthDate] = useState(initialBirth?.slice(0, 10) ?? "");
  const [birthTime, setBirthTime] = useState(initialBirth?.slice(11) ?? "00:00");
  const [birthCityId, setBirthCityId] = useState(initialCity ?? "");
  const [ranking, setRanking] = useState<RankItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => setElapsed(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [busy]);

  async function computeRank() {
    if (!validBirthDate(birthDate) || birthDate < "1900-01-01") { setError("请选择有效的出生日期。"); return; }
    if (!/^\d{2}:\d{2}$/u.test(birthTime)) { setError("请填写出生时间（不确定可保持 00:00）。"); return; }
    if (!birthCityId) { setError("请选择出生城市。"); return; }
    setBusy(true);
    setError("");
    setElapsed(0);
    try {
      const response = await fetch("/api/myfate/rank", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ birthDate, birthTime, birthDistrictCode: birthCityId }),
      });
      if (response.status === 401) {
        window.location.replace(`/login?next=${encodeURIComponent(`/home/relationship-test/rank?birth=${encodeURIComponent(`${birthDate} ${birthTime}`)}&city=${encodeURIComponent(birthCityId)}`)}&from=${encodeURIComponent("/home/relationship-test")}`);
        return;
      }
      if (!response.ok) throw new Error("暂时无法计算适配榜，请稍后重试。");
      const data = await response.json() as { ranking?: RankItem[] };
      if (!Array.isArray(data.ranking) || !data.ranking.length) throw new Error("适配榜数据为空。");
      setRanking(data.ranking);
      window.requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "暂时无法计算适配榜。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mf-bz-rank">
      <header className="mf-bz-rank-head">
        <span>适配榜</span>
        <h1>你和哪位偶像最配？</h1>
        <p>填写你的出生信息，我们按吠陀合盘的计算数据为全部偶像排名。榜单免费，点开任意一位可生成完整报告（消耗 1 次额度）。</p>
      </header>

      <section className="mf-bz-rank-form">
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
        <button className="mf-bz-btn" type="button" disabled={busy} onClick={() => void computeRank()}>
          {busy ? `计算中 ${elapsed}s…` : "生成适配榜"}
        </button>
      </section>
      <div className="mf-report-login-error" role="alert">{error}</div>
      {busy ? <div className="mf-report-generation-progress" role="progressbar" aria-label="计算中"><i /></div> : null}

      <div ref={resultRef}>
        {ranking ? (
          <>
            <section className="mf-bz-rank-podium">
              {ranking.slice(0, 3).map((item, index) => (
                <Link className={`mf-bz-rank-top ${index === 0 ? "is-first" : ""}`} href={`/home/relationship-test/${item.starId}/test?birth=${encodeURIComponent(`${birthDate} ${birthTime}`)}&city=${encodeURIComponent(birthCityId)}`} key={item.starId}>
                  <span className="mf-bz-rank-medal">{["🥇", "🥈", "🥉"][index]}</span>
                  <img src={portraitImage(item.portraitSrc, 120)} alt="" />
                  <b>{item.name}</b>
                  <span>{item.role}</span>
                  <strong>{item.score}</strong>
                  <small>匹配指数</small>
                </Link>
              ))}
            </section>
            <ol className="mf-bz-rank-list">
              {ranking.slice(3).map((item, index) => (
                <li key={item.starId}>
                  <Link href={`/home/relationship-test/${item.starId}/test?birth=${encodeURIComponent(`${birthDate} ${birthTime}`)}&city=${encodeURIComponent(birthCityId)}`}>
                    <b>{index + 4}</b>
                    <img src={portraitImage(item.portraitSrc, 120)} alt="" />
                    <div><strong>{item.name}</strong><span>{item.role}</span></div>
                    <i>{item.score}</i>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </div>
    </main>
  );
}
