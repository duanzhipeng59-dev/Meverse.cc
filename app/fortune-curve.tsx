"use client";

import { useMemo, useState } from "react";
import { buildFortuneCurves, type FortuneCurveData, type FortunePoint } from "./myfate-portrait-consult";

type TabKey = "overview" | "career" | "wealth" | "love";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "career", label: "事业" },
  { key: "wealth", label: "财富" },
  { key: "love", label: "感情" },
];

const KEYWORDS: Record<string, string> = {
  顺势: "突破 · 扩张 · 收获",
  稳步: "积累 · 节奏 · 沉淀",
  平稳: "平衡 · 观察 · 过渡",
  调整: "防守 · 整理 · 蓄力",
};

const W = 800;
const H = 260;
const PAD_X = 14;
const PAD_TOP = 46;
const PAD_BOTTOM = 26;

function bandOf(score: number) {
  if (score >= 75) return "顺势";
  if (score >= 60) return "稳步";
  if (score >= 45) return "平稳";
  return "调整";
}

// 人生运势曲线:总览/事业/财富/感情四层切换,节点点击弹出阶段详情卡。
export default function FortuneCurveCard({ careerLifetime, wealthLifetime, loveMarriage, currentAge }: {
  careerLifetime: Array<{ age: string; score: number }>;
  wealthLifetime: Array<{ age: string; trend: string }>;
  loveMarriage: Array<{ age: string; tag: string }>;
  currentAge: number | null;
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [selected, setSelected] = useState<(FortunePoint & { x: number; y: number }) | null>(null);
  const curves = useMemo(() => buildFortuneCurves({ careerLifetime, wealthLifetime, loveMarriage }), [careerLifetime, wealthLifetime, loveMarriage]);
  const data: FortuneCurveData = curves[tab];

  const geo = useMemo(() => {
    const points = data.points;
    const minAge = points[0].age;
    const maxAge = points[points.length - 1].age;
    const minScore = Math.min(...points.map((p) => p.score)) - 6;
    const maxScore = Math.max(...points.map((p) => p.score)) + 6;
    const toX = (age: number) => PAD_X + ((age - minAge) / (maxAge - minAge)) * (W - PAD_X * 2);
    const toY = (score: number) => PAD_TOP + (1 - (score - minScore) / (maxScore - minScore)) * (H - PAD_TOP - PAD_BOTTOM);
    const coords = points.map((p) => ({ ...p, x: toX(p.age), y: toY(p.score) }));
    let line = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i += 1) {
      const p0 = coords[Math.max(0, i - 1)];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[Math.min(coords.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      line += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    const area = `${line} L ${coords[coords.length - 1].x} ${H - PAD_BOTTOM} L ${coords[0].x} ${H - PAD_BOTTOM} Z`;
    return { coords, line, area, minAge, maxAge };
  }, [data]);

  const current = useMemo(() => {
    if (currentAge === null || currentAge < geo.minAge || currentAge > geo.maxAge) return null;
    return geo.coords.reduce<(FortunePoint & { x: number; y: number }) | null>((best, p) => {
      if (!best || Math.abs(p.age - currentAge) < Math.abs(best.age - currentAge)) return p;
      return best;
    }, null);
  }, [geo, currentAge]);

  function pointFromClientX(clientX: number) {
    const rect = document.querySelector(".mf-fortune-svg")?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width) * W;
    return geo.coords.reduce<(FortunePoint & { x: number; y: number }) | null>((best, p) => {
      if (!best || Math.abs(p.x - x) < Math.abs(best.x - x)) return p;
      return best;
    }, null);
  }

  const info = selected;

  function infoTitle(point: FortunePoint) {
    if (point.age === data.peak.age && point.score === data.peak.score) return "阶段高点";
    if (point.age === data.low.age && point.score === data.low.score) return "阶段低谷";
    if (currentAge !== null && point.age === currentAge) return "当前位置";
    return "阶段解读";
  }

  function careerWord(v: number) {
    return v >= 75 ? "明显上升" : v >= 60 ? "稳步推进" : v >= 45 ? "平稳维持" : "承压调整";
  }
  function wealthWord(v: number) {
    return v >= 75 ? "积累加速" : v >= 60 ? "稳健进账" : v >= 45 ? "平稳过渡" : "支出承压";
  }

  const infoCoord = info ? geo.coords.find((p) => p.age === info.age) ?? null : null;
  const cardLeft = infoCoord ? Math.min(72, Math.max(3, (infoCoord.x / W) * 100 - 16)) : 0;

  return (
    <section className="mf-zr-card mf-fortune" aria-label="人生运势曲线">
      <div className="mf-fortune-head">
        <h2><i aria-hidden="true">✦</i>人生运势曲线</h2>
        <p>综合事业、财富与人生阶段变化，呈现7～80岁的整体发展趋势</p>
        <p className="mf-fortune-disclaimer">曲线反映阶段性的相对高低变化，不代表绝对吉凶。</p>
      </div>

      <div className="mf-fortune-tabs" role="tablist" aria-label="运势维度">
        {TABS.map((item) => (
          <button key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? "is-active" : ""} type="button" onClick={() => { setTab(item.key); setSelected(null); }}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="mf-fortune-stage">
        {info && infoCoord ? (
          <div className="mf-fortune-card" style={{ left: `${cardLeft}%` }}>
            <b>{info.age}岁｜{infoTitle(info)}</b>
            <div className="mf-fortune-card-rows">
              <span>{tab === "overview" ? "综合趋势" : "趋势强度"}：<b>{info.score}/100</b></span>
              {tab !== "career" ? <span>事业：{careerWord(info.career)}</span> : null}
              {tab !== "wealth" ? <span>财富：{wealthWord(info.wealth)}</span> : null}
              {tab !== "love" ? <span>感情：{info.love >= 75 ? "缘分升温" : info.love >= 60 ? "平稳相处" : info.love >= 45 ? "平淡期" : "需多留意"}</span> : null}
            </div>
            <span className="mf-fortune-card-keys">关键词：{KEYWORDS[bandOf(info.score)]}</span>
            <p className="mf-fortune-card-summary">阶段解读：{info.summary}</p>
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="mf-fortune-svg"
          onTouchStart={(event) => setSelected(pointFromClientX(event.touches[0].clientX))}
          onTouchMove={(event) => setSelected(pointFromClientX(event.touches[0].clientX))}
          onClick={(event) => setSelected(pointFromClientX(event.clientX))}
          onMouseMove={(event) => { if (!selected) setSelected(pointFromClientX(event.clientX)); }}
        >
          <defs>
            <linearGradient id="mf-fortune-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B6FD8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8B6FD8" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {current ? (
            <>
              <line x1={current.x} y1={PAD_TOP - 18} x2={current.x} y2={H - PAD_BOTTOM} stroke="#B9A6EE" strokeWidth="2" strokeDasharray="7 6" />
              <text x={current.x} y={PAD_TOP - 26} textAnchor="middle" className="mf-fortune-label">现在 {current.age}岁</text>
            </>
          ) : null}
          <path d={geo.area} fill="url(#mf-fortune-fill)" stroke="none" />
          <path d={geo.line} fill="none" stroke="#9B7FE8" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {(() => {
            const peakCoord = geo.coords.find((p) => p.age === data.peak.age);
            if (!peakCoord) return null;
            return (
              <>
                <circle cx={peakCoord.x} cy={peakCoord.y} r="7" fill="#fff" stroke="#8B6FD8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <text x={peakCoord.x} y={peakCoord.y - 16} textAnchor="middle" className="mf-fortune-label">最高 {data.peak.age}岁</text>
              </>
            );
          })()}
          {(() => {
            const lowCoord = geo.coords.find((p) => p.age === data.low.age);
            if (!lowCoord || data.low.age === data.peak.age) return null;
            return (
              <>
                <circle cx={lowCoord.x} cy={lowCoord.y} r="7" fill="#fff" stroke="#8B6FD8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <text x={lowCoord.x} y={lowCoord.y + 28} textAnchor="middle" className="mf-fortune-label">低谷 {data.low.age}岁</text>
              </>
            );
          })()}
          {info && infoCoord ? <circle cx={infoCoord.x} cy={infoCoord.y} r="6" fill="#fff" stroke="#C64270" strokeWidth="3" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      </div>
    </section>
  );
}
