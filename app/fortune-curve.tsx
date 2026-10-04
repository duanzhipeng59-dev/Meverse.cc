"use client";

import { useMemo, useState } from "react";
import { buildFortuneStages, sampleFortuneStages, type FortuneStageSet } from "./myfate-portrait-consult";

type TabKey = "overview" | "career" | "wealth" | "love";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "总览" },
  { key: "career", label: "事业" },
  { key: "wealth", label: "财富" },
  { key: "love", label: "感情" },
];

const KEYWORDS: Record<string, string> = {
  up: "突破 · 扩张 · 收获",
  steady: "积累 · 节奏 · 沉淀",
  down: "防守 · 整理 · 蓄力",
};

const STAGE_SUMMARY: Record<TabKey, Record<string, string>> = {
  overview: {
    up: "整体势能上行，事业与财富容易同步走高，是主动出击的窗口期。",
    steady: "整体平顺，适合稳步推进核心目标，把积累变成成果。",
    down: "整体处于调整段，控制风险、整理节奏，先稳住基本盘。",
  },
  career: {
    up: "事业进入上升通道，争取核心项目与更大话语权正当其时。",
    steady: "事业节奏平稳，把流程与专业打磨好就是进展。",
    down: "事业阶段性承压，减少多头出击，先解决最关键的一件事。",
  },
  wealth: {
    up: "财富积累加速，收入与资产都有上行空间，可适度进取。",
    steady: "财务平稳，按计划定投与储蓄，复利是主旋律。",
    down: "财务承压，优先守现金、降杠杆，避免大额冲动投入。",
  },
  love: {
    up: "感情浓度高，关系容易升温或走进新阶段，值得投入心力。",
    steady: "感情平稳，增加一点仪式感就能有效保鲜。",
    down: "感情波动偏多，多沟通少较真，给彼此留出缓冲。",
  },
};

const W = 800;
const H = 210;
const PAD_X = 16;
const PAD_TOP = 52;
const PAD_BOTTOM = 40;

// 人生运势曲线:阶段趋势叙事(6-10 个主要起伏),当前年龄为唯一强锚点。
export default function FortuneCurveCard({ careerLifetime, wealthLifetime, loveMarriage, currentAge }: {
  careerLifetime: Array<{ age: string; score: number }>;
  wealthLifetime: Array<{ age: string; trend: string }>;
  loveMarriage: Array<{ age: string; tag: string }>;
  currentAge: number | null;
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const [hoverAge, setHoverAge] = useState<number | null>(null);
  const stages = useMemo(() => buildFortuneStages({ careerLifetime, wealthLifetime, loveMarriage }), [careerLifetime, wealthLifetime, loveMarriage]);

  const data = useMemo(() => {
    const active = stages[tab];
    const points = sampleFortuneStages(active);
    const minAge = 7;
    const maxAge = 80;
    const minScore = Math.min(...points.map((p) => p.score)) - 8;
    const maxScore = Math.max(...points.map((p) => p.score)) + 8;
    const toX = (age: number) => PAD_X + ((age - minAge) / (maxAge - minAge)) * (W - PAD_X * 2);
    const toY = (score: number) => PAD_TOP + (1 - (score - minScore) / (maxScore - minScore)) * (H - PAD_TOP - PAD_BOTTOM);
    const coords = points.map((p) => ({ ...p, x: toX(p.age), y: toY(p.score) }));
    // 平滑:阶段边界之间线性过渡,Catmull-Rom 软化拐角
    let line = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i += 1) {
      const p0 = coords[Math.max(0, i - 1)];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[Math.min(coords.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 8;
      const c1y = p1.y + (p2.y - p0.y) / 8;
      const c2x = p2.x - (p3.x - p1.x) / 8;
      const c2y = p2.y - (p3.y - p1.y) / 8;
      line += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    const area = `${line} L ${coords[coords.length - 1].x} ${H - PAD_BOTTOM + 12} L ${coords[0].x} ${H - PAD_BOTTOM + 12} Z`;
    return { coords, line, area, minAge, maxAge };
  }, [stages, tab]);

  const peak = useMemo(() => data.coords.reduce((best, p) => (p.score > best.score ? p : best), data.coords[0]), [data]);
  const low = useMemo(() => data.coords.reduce((best, p) => (p.score < best.score ? p : best), data.coords[0]), [data]);
  const current = useMemo(() => {
    if (currentAge === null) return null;
    return data.coords.reduce<(typeof data.coords)[number] | null>((best, p) => {
      if (!best || Math.abs(p.age - currentAge) < Math.abs(best.age - currentAge)) return p;
      return best;
    }, null);
  }, [data, currentAge]);

  const hoverPoint = hoverAge ? data.coords.find((p) => p.age === hoverAge) ?? null : null;
  const selectedPoint = selectedAge ? data.coords.find((p) => p.age === selectedAge) ?? null : null;
  const stageOfSelected = selectedAge ? stages[tab].find((s) => selectedAge >= s.startAge && selectedAge <= s.endAge) ?? null : null;

  function ageFromClientX(clientX: number) {
    const rect = document.querySelector(".mf-fortune-svg")?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width) * W;
    const nearest = data.coords.reduce((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), data.coords[0]);
    return nearest.age;
  }

  function arrow(kind: "career" | "wealth" | "love", age: number) {
    const stagesFor = stages[kind === "career" ? "career" : kind === "wealth" ? "wealth" : "love"];
    const at = (a: number) => stagesFor.find((s) => a >= s.startAge && a <= s.endAge)?.score ?? (a < stagesFor[0].startAge ? stagesFor[0].score : stagesFor[stagesFor.length - 1].score);
    const diff = at(age) - at(Math.max(7, age - 3));
    return diff >= 3 ? "↑" : diff <= -3 ? "↓" : "→";
  }

  const tipPoint = hoverPoint ?? selectedPoint;
  const tipStage = tipPoint ? stages[tab].find((s) => tipPoint.age >= s.startAge && tipPoint.age <= s.endAge) ?? null : null;

  return (
    <section className="mf-zr-card mf-fortune" aria-label="人生运势曲线">
      <div className="mf-fortune-head">
        <h2><i aria-hidden="true">✦</i>人生运势曲线</h2>
        <p>7—80岁的人生发展趋势 · 综合事业 / 财富 / 感情</p>
      </div>

      <div className="mf-fortune-tabs" role="tablist" aria-label="运势维度">
        {TABS.map((item) => (
          <button key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? "is-active" : ""} type="button" onClick={() => { setTab(item.key); setSelectedAge(null); setHoverAge(null); }}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="mf-fortune-stage">
        {/* 当前年龄胶囊:唯一强锚点 */}
        {current ? (
          <div className="mf-fortune-now" style={{ left: `${(current.x / W) * 100}%` }}>
            <span className="mf-fortune-now-pill"><i aria-hidden="true" />现在 · {current.age}岁</span>
          </div>
        ) : null}
        {/* 轻量浮层:hover 节点信息 */}
        {tipPoint && tipStage ? (
          <div
            className="mf-fortune-tip"
            style={{ left: `${Math.min(66, Math.max(2, (tipPoint.x / W) * 100 - 12))}%` }}
          >
            <b>{tipPoint.age}岁 · {tipStage.label}｜综合 {tipPoint.score}</b>
            <span>事业 {arrow("career", tipPoint.age)}　财富 {arrow("wealth", tipPoint.age)}　感情 {arrow("love", tipPoint.age)}</span>
            <span className="is-keys">关键词：{KEYWORDS[tipStage.trend]}</span>
          </div>
        ) : null}
        <svg
          ref={(el) => { if (el) (el as SVGSVGElement & { __cleanup?: () => void }).__cleanup = undefined; }}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="mf-fortune-svg"
          onTouchStart={(event) => setHoverAge(ageFromClientX(event.touches[0].clientX))}
          onTouchMove={(event) => setHoverAge(ageFromClientX(event.touches[0].clientX))}
          onClick={(event) => setSelectedAge(ageFromClientX(event.clientX))}
          onMouseMove={(event) => setHoverAge(ageFromClientX(event.clientX))}
          onMouseLeave={() => setHoverAge(null)}
        >
          <defs>
            <linearGradient id="mf-fortune-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B6FD8" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#8B6FD8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {current ? (
            <>
              <line x1={current.x} y1={PAD_TOP - 12} x2={current.x} y2={H - PAD_BOTTOM + 6} stroke="#B9A6EE" strokeWidth="1.5" strokeDasharray="5 6" opacity="0.55" />
              <circle cx={current.x} cy={current.y} r="6" fill="#8B6FD8" stroke="#E4DBF8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </>
          ) : null}
          <path d={data.area} fill="url(#mf-fortune-fill)" stroke="none" />
          <path d={data.line} fill="none" stroke="#9B7FE8" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {(() => {
            const peakCoord = data.coords.find((p) => p.age === peak.age);
            if (!peakCoord || peak.age === current?.age) return null;
            return (
              <>
                <circle cx={peakCoord.x} cy={peakCoord.y} r="5" fill="#100d16" stroke="#B9A6EE" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <text x={peakCoord.x} y={peakCoord.y - 12} textAnchor="middle" className="mf-fortune-label">
                  <tspan x={peakCoord.x} dy="0">{peak.age}岁</tspan>
                  <tspan x={peakCoord.x} dy="15">{peak.trend === "down" ? "阶段高点" : "阶段高点"}</tspan>
                </text>
              </>
            );
          })()}
          {(() => {
            const lowCoord = data.coords.find((p) => p.age === low.age);
            if (!lowCoord || low.age === peak.age || low.age === current?.age) return null;
            return (
              <>
                <circle cx={lowCoord.x} cy={lowCoord.y} r="5" fill="#100d16" stroke="#B9A6EE" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                <text x={lowCoord.x} y={lowCoord.y + 20} textAnchor="middle" className="mf-fortune-label">
                  <tspan x={lowCoord.x} dy="0">{low.age}岁</tspan>
                  <tspan x={lowCoord.x} dy="15">阶段低点</tspan>
                </text>
              </>
            );
          })()}
          {hoverPoint ? <circle cx={hoverPoint.x} cy={hoverPoint.y} r="5" fill="#C64270" stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      </div>

      {/* 阶段解读:图表下方,点击节点后出现 */}
      {selectedPoint && stageOfSelected ? (
        <div className="mf-fortune-story" role="status">
          <b>{selectedPoint.age}岁阶段解读 · {stageOfSelected.label}</b>
          <p>{STAGE_SUMMARY[tab][stageOfSelected.trend]}</p>
          <small>关键词：{KEYWORDS[stageOfSelected.trend]}</small>
        </div>
      ) : null}

      <p className="mf-fortune-footnote">曲线仅表示阶段相对变化，不代表绝对吉凶。</p>
    </section>
  );
}
