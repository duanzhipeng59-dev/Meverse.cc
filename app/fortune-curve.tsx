"use client";

import { useMemo, useRef, useState } from "react";
import { buildFortuneCurveControls } from "./myfate-portrait-consult";

const W = 800;
const H = 210;
const PAD_X = 16;
const PAD_TOP = 40;
const PAD_BOTTOM = 30;

type Sample = { age: number; score: number; x: number; y: number };

// 人生运势曲线:7-9 个控制点的山脉式平滑趋势,当前年龄弱定位线,无 Tab/胶囊/免责声明。
export default function FortuneCurveCard({ careerLifetime, wealthLifetime, loveMarriage, currentAge }: {
  careerLifetime: Array<{ age: string; score: number }>;
  wealthLifetime: Array<{ age: string; trend: string }>;
  loveMarriage: Array<{ age: string; tag: string }>;
  currentAge: number | null;
}) {
  const [hoverAge, setHoverAge] = useState<number | null>(null);
  const [selectedAge, setSelectedAge] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const controls = useMemo(() => buildFortuneCurveControls({ careerLifetime, wealthLifetime, loveMarriage }), [careerLifetime, wealthLifetime, loveMarriage]);

  const samples = useMemo<Sample[]>(() => {
    const pts: Sample[] = [];
    for (let age = 7; age <= 80; age += 1) {
      let score: number;
      if (age <= controls[0].age) score = controls[0].score;
      else if (age >= controls[controls.length - 1].age) score = controls[controls.length - 1].score;
      else {
        const nextIndex = controls.findIndex((c) => c.age >= age);
        const prev = controls[nextIndex - 1];
        const next = controls[nextIndex];
        score = prev.score + ((next.score - prev.score) * (age - prev.age)) / (next.age - prev.age);
      }
      pts.push({ age, score: Math.round(score), x: 0, y: 0 });
    }
    const minScore = Math.min(...pts.map((p) => p.score)) - 3;
    const maxScore = Math.max(...pts.map((p) => p.score)) + 3;
    for (const p of pts) {
      p.x = PAD_X + ((p.age - 7) / 73) * (W - PAD_X * 2);
      p.y = PAD_TOP + (1 - (p.score - minScore) / (maxScore - minScore)) * (H - PAD_TOP - PAD_BOTTOM);
    }
    return pts;
  }, [controls]);

  const smoothed = useMemo(() => {
    // 3 点移动平均:滤掉插值残差的小锯齿,保留阶段级趋势转折
    return samples.map((p, i) => {
      if (i === 0 || i === samples.length - 1) return p;
      const prev = samples[i - 1];
      const next = samples[i + 1];
      return { ...p, y: (prev.y + p.y * 2 + next.y) / 4 };
    });
  }, [samples]);

  const line = useMemo(() => {
    const pts = smoothed;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < samples.length - 1; i += 1) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 7;
      const c1y = p1.y + (p2.y - p0.y) / 7;
      const c2x = p2.x - (p3.x - p1.x) / 7;
      const c2y = p2.y - (p3.y - p1.y) / 7;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [samples]);
  const area = `${line} L ${smoothed[smoothed.length - 1].x} ${H - PAD_BOTTOM + 10} L ${smoothed[0].x} ${H - PAD_BOTTOM + 10} Z`;

  const peak = smoothed.reduce<Sample>((best, p) => (p.score > best.score ? p : best), smoothed[0]);
  const low = smoothed.reduce<Sample>((best, p) => (p.score < best.score ? p : best), smoothed[0]);
  const current = currentAge !== null ? smoothed.reduce<Sample | null>((best, p) => {
    if (!best || Math.abs(p.age - currentAge) < Math.abs(best.age - currentAge)) return p;
    return best;
  }, null) : null;

  const hoverPoint = hoverAge !== null ? smoothed.find((p) => p.age === hoverAge) ?? null : null;
  const selectedPoint = selectedAge !== null ? smoothed.find((p) => p.age === selectedAge) ?? null : null;

  // 点击节点的阶段解读(叙事句):按控制点趋势
  const selectedStage = selectedAge !== null ? controls.find((c) => selectedAge >= c.age - 5 && selectedAge <= c.age + 5) ?? controls.reduce((best, c) => (Math.abs(c.age - (selectedAge ?? 0)) < Math.abs(best.age - (selectedAge ?? 0)) ? c : best), controls[0]) : null;
  const selectedTrend = selectedStage?.trend ?? "steady";

  function ageFromClientX(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width) * W;
    const nearest = smoothed.reduce<Sample>((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), smoothed[0]);
    return nearest.age;
  }

  const tipPoint = hoverPoint ?? selectedPoint;
  const tipLabel = tipPoint ? controls.find((c) => Math.abs(c.age - tipPoint.age) <= 5)?.label ?? (tipPoint.score > samples.reduce((s, p) => s + p.score, 0) / samples.length ? "上升期" : "平稳期") : "";
  const tipX = tipPoint?.x ?? 0;

  return (
    <section className="mf-zr-card mf-fortune" aria-label="人生运势曲线">
      <div className="mf-fortune-head">
        <h2><i aria-hidden="true">✦</i>人生运势曲线</h2>
        <p>7—80岁的人生发展趋势 · 综合事业 / 财富 / 感情</p>
      </div>

      <div className="mf-fortune-stage">
        {/* 当前年龄:仅弱定位线,无胶囊文字 */}
        {current ? (
          <>
            <div className="mf-fortune-nowline" style={{ left: `${(current.x / W) * 100}%` }} aria-hidden="true" />
            <span className="mf-fortune-nowtag" style={{ left: `${(current.x / W) * 100}%` }}>{current.age}岁</span>
          </>
        ) : null}
        {/* 轻浮层:hover 时节点附近 */}
        {tipPoint && !selectedPoint ? (
          <div className="mf-fortune-tip" style={{ left: `${Math.min(70, Math.max(3, (tipX / W) * 100 - 10))}%` }}>
            <b>{tipPoint.age}岁 · {tipLabel}｜{tipPoint.score}</b>
            <span>事业 ↑　财富 →　感情 →</span>
          </div>
        ) : null}
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mf-fortune-svg"
          onTouchStart={(event) => setHoverAge(ageFromClientX(event.touches[0].clientX))}
          onTouchMove={(event) => setHoverAge(ageFromClientX(event.touches[0].clientX))}
          onClick={(event) => setSelectedAge(ageFromClientX(event.clientX))}
          onMouseMove={(event) => setHoverAge(ageFromClientX(event.clientX))}
          onMouseLeave={() => setHoverAge(null)}
        >
          <defs>
            <linearGradient id="mf-fortune-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B6FD8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#8B6FD8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {current ? <line x1={current.x} y1={PAD_TOP - 16} x2={current.x} y2={H - PAD_BOTTOM + 8} stroke="#B9A6EE" strokeWidth="1.5" strokeDasharray="5 7" opacity="0.3" /> : null}
          <path d={area} fill="url(#mf-fortune-fill)" stroke="none" />
          <path d={line} fill="none" stroke="#9B7FE8" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {/* 关键节点:小圆点 + 短标签 */}
          {peak.age !== current?.age ? (
            <>
              <circle cx={peak.x} cy={peak.y} r="5" fill="#FCFAF8" stroke="#9B7FE8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <text x={peak.x} y={peak.y - 14} textAnchor="middle" className="mf-fortune-label">{peak.age}岁 高点</text>
            </>
          ) : null}
          {low.age !== peak.age && low.age !== current?.age ? (
            <>
              <circle cx={low.x} cy={low.y} r="5" fill="#FCFAF8" stroke="#9B7FE8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <text x={low.x} y={low.y + 22} textAnchor="middle" className="mf-fortune-label">{low.age}岁 低点</text>
            </>
          ) : null}
          {current ? <circle cx={current.x} cy={current.y} r="5" fill="#FCFAF8" stroke="#8B6FD8" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /> : null}
          {hoverPoint ? <circle cx={hoverPoint.x} cy={hoverPoint.y} r="5" fill="#C64270" stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      </div>

      {/* 阶段解读:点击曲线后出现在图表下方 */}
      {selectedPoint && selectedStage ? (
        <div className="mf-fortune-story" role="status">
          <b>{selectedPoint.age}岁阶段解读 · {selectedStage.label}</b>
          <p>{selectedTrend === "up" ? "这一阶段整体势能上行，事业与财富容易同步走高，适合主动出击、放大成果。" : selectedTrend === "down" ? "这一阶段进入调整期，变化与消耗偏多，控制风险、整理节奏，先稳住基本盘。" : "这一阶段整体平顺，适合稳步推进核心目标，把积累慢慢变成看得见的成果。"}</p>
          <small>关键词：{selectedTrend === "up" ? "突破 · 扩张 · 收获" : selectedTrend === "down" ? "防守 · 整理 · 蓄力" : "积累 · 节奏 · 沉淀"}</small>
        </div>
      ) : null}
    </section>
  );
}
