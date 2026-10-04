"use client";

import { useMemo } from "react";
import { buildFortuneCurveControls } from "./myfate-portrait-consult";

const W = 800;
const H = 220;
const PAD_X = 16;
const PAD_TOP = 34;
const PAD_BOTTOM = 40;

type Sample = { age: number; score: number; x: number; y: number };

// 人生运势曲线:纯趋势可视化,弱交互强视觉——4-6 个主要趋势控制点的山脉式平滑曲线。
export default function FortuneCurveCard({ careerLifetime, wealthLifetime, loveMarriage, currentAge }: {
  careerLifetime: Array<{ age: string; score: number }>;
  wealthLifetime: Array<{ age: string; trend: string }>;
  loveMarriage: Array<{ age: string; tag: string }>;
  currentAge: number | null;
}) {
  const controls = useMemo(() => buildFortuneCurveControls({ careerLifetime, wealthLifetime, loveMarriage }), [careerLifetime, wealthLifetime, loveMarriage]);

  const smoothed = useMemo<Sample[]>(() => {
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
    const mapped = pts.map((p) => ({ ...p, x: PAD_X + ((p.age - 7) / 73) * (W - PAD_X * 2), y: PAD_TOP + (1 - (p.score - minScore) / (maxScore - minScore)) * (H - PAD_TOP - PAD_BOTTOM) }));
    // 3 点移动平均:滤掉插值残差
    return mapped.map((p, i) => {
      if (i === 0 || i === mapped.length - 1) return p;
      const prev = mapped[i - 1];
      const next = mapped[i + 1];
      return { ...p, y: (prev.y + p.y * 2 + next.y) / 4 };
    });
  }, [controls]);

  const line = useMemo(() => {
    let d = `M ${smoothed[0].x} ${smoothed[0].y}`;
    for (let i = 0; i < smoothed.length - 1; i += 1) {
      const p0 = smoothed[Math.max(0, i - 1)];
      const p1 = smoothed[i];
      const p2 = smoothed[i + 1];
      const p3 = smoothed[Math.min(smoothed.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 7;
      const c1y = p1.y + (p2.y - p0.y) / 7;
      const c2x = p2.x - (p3.x - p1.x) / 7;
      const c2y = p2.y - (p3.y - p1.y) / 7;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }, [smoothed]);
  const area = `${line} L ${smoothed[smoothed.length - 1].x} ${H - PAD_BOTTOM + 10} L ${smoothed[0].x} ${H - PAD_BOTTOM + 10} Z`;

  const peak = smoothed.reduce<Sample>((best, p) => (p.score > best.score ? p : best), smoothed[0]);
  const low = smoothed.reduce<Sample>((best, p) => (p.score < best.score ? p : best), smoothed[0]);
  const current = currentAge !== null ? smoothed.reduce<Sample>((best, p) => (Math.abs(p.age - currentAge) < Math.abs(best.age - currentAge) ? p : best), smoothed[0]) : null;

  return (
    <section className="mf-zr-card mf-fortune" aria-label="人生运势曲线">
      <div className="mf-fortune-head">
        <h2><i aria-hidden="true">✦</i>人生运势曲线</h2>
        <p>7—80岁的人生发展趋势 · 综合事业 / 财富 / 感情</p>
      </div>

      <div className="mf-fortune-stage">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mf-fortune-svg" aria-hidden="true">
          <defs>
            <linearGradient id="mf-fortune-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B6FD8" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#8B6FD8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {current ? <line x1={current.x} y1={PAD_TOP - 14} x2={current.x} y2={H - PAD_BOTTOM + 8} stroke="#B9A6EE" strokeWidth="1.5" strokeDasharray="5 7" opacity="0.3" /> : null}
          <path d={area} fill="url(#mf-fortune-fill)" stroke="none" />
          <path d={line} fill="none" stroke="#9B7FE8" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {peak.age !== current?.age ? (
            <>
              <circle cx={peak.x} cy={peak.y} r="5" fill="#FCFAF8" stroke="#9B7FE8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <text x={peak.x} y={peak.y - 24} textAnchor="middle" className="mf-fortune-label">{peak.age}岁</text>
              <text x={peak.x} y={peak.y - 10} textAnchor="middle" className="mf-fortune-label is-sub">阶段高点</text>
            </>
          ) : null}
          {low.age !== peak.age && low.age !== current?.age ? (
            <>
              <circle cx={low.x} cy={low.y} r="5" fill="#FCFAF8" stroke="#9B7FE8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <text x={low.x} y={low.y + 24} textAnchor="middle" className="mf-fortune-label">{low.age}岁</text>
              <text x={low.x} y={low.y + 38} textAnchor="middle" className="mf-fortune-label is-sub">阶段低点</text>
            </>
          ) : null}
          {current ? <circle cx={current.x} cy={current.y} r="4.5" fill="#FCFAF8" stroke="#8B6FD8" strokeWidth="2" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      </div>
    </section>
  );
}
