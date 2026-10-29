"use client";

import { useMemo } from "react";
import { buildFortuneCurveControls } from "./myfate-portrait-consult";

const W = 800;
const H = 260;
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

  // ── 单调三次插值(Fritsch–Carlson,同 d3.curveMonotoneX):曲线精确过每个控制点、
// 段间无过冲(不产生超出原始数据的峰谷)、切线连续无折角;贝塞尔控制点取 1/3 切线长。 ──
  const { line, samples } = useMemo(() => {
    // 曲线横向映射:起点终点各向内收 10%,两端不贴卡片边缘
    const INSET = (W - PAD_X * 2) * 0.1;
    const px = (age: number) => PAD_X + INSET + ((age - 7) / 73) * (W - PAD_X * 2 - INSET * 2);
    const minScore = Math.min(...controls.map((c) => c.score)) - 3;
    const maxScore = Math.max(...controls.map((c) => c.score)) + 3;
    const py = (score: number) => PAD_TOP + (1 - (score - minScore) / (maxScore - minScore)) * (H - PAD_TOP - PAD_BOTTOM);

    const n = controls.length;
    const xs = controls.map((c) => px(c.age));
    const ys = controls.map((c) => py(c.score));
    const h: number[] = [];
    const delta: number[] = [];
    for (let i = 0; i < n - 1; i += 1) {
      h.push(xs[i + 1] - xs[i]);
      delta.push((ys[i + 1] - ys[i]) / h[i]);
    }
    const m: number[] = new Array(n).fill(0);
    m[0] = delta[0];
    m[n - 1] = delta[n - 2];
    for (let i = 1; i < n - 1; i += 1) {
      m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
    }
    for (let i = 0; i < n - 1; i += 1) {
      if (delta[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / delta[i];
      const b = m[i + 1] / delta[i];
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        m[i] = t * a * delta[i];
        m[i + 1] = t * b * delta[i];
      }
    }

    let d = `M ${xs[0]} ${ys[0]}`;
    for (let i = 0; i < n - 1; i += 1) {
      d += ` C ${xs[i] + h[i] / 3} ${ys[i] + (m[i] * h[i]) / 3}, ${xs[i + 1] - h[i] / 3} ${ys[i + 1] - (m[i + 1] * h[i]) / 3}, ${xs[i + 1]} ${ys[i + 1]}`;
    }

    // 逐年龄采样(Hermite 求值),用于峰谷/当前位置标记
    const pts: Sample[] = [];
    for (let age = 7; age <= 80; age += 1) {
      let seg = 0;
      while (seg < n - 2 && controls[seg + 1].age < age) seg += 1;
      const t = Math.min(1, Math.max(0, (px(age) - xs[seg]) / h[seg]));
      const t2 = t * t;
      const t3 = t2 * t;
      const y = (2 * t3 - 3 * t2 + 1) * ys[seg]
        + (t3 - 2 * t2 + t) * h[seg] * m[seg]
        + (-2 * t3 + 3 * t2) * ys[seg + 1]
        + (t3 - t2) * h[seg] * m[seg + 1];
      pts.push({ age, score: 0, x: px(age), y });
    }
    return { line: d, samples: pts };
  }, [controls]);

  const area = `${line} L ${samples[samples.length - 1].x} ${H - PAD_BOTTOM + 10} L ${samples[0].x} ${H - PAD_BOTTOM + 10} Z`;

  // 单调插值保证不越过控制点,y 最小即峰、最大即谷
  const peak = samples.reduce<Sample>((best, p) => (p.y < best.y ? p : best), samples[0]);
  const low = samples.reduce<Sample>((best, p) => (p.y > best.y ? p : best), samples[0]);
  const current = currentAge !== null ? samples.reduce<Sample>((best, p) => (Math.abs(p.age - currentAge) < Math.abs(best.age - currentAge) ? p : best), samples[0]) : null;

  return (
    <section className="mf-zr-card mf-fortune" aria-label="人生运势">
      <div className="mf-zr-section-head mf-sr-head">
        <div><h2><i aria-hidden="true">✦</i>人生运势</h2></div>
        <p className="mf-fortune-sub">7—80岁大运走势 · 综合事业 / 财富</p>
      </div>

      <div className="mf-fortune-stage">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mf-fortune-svg" aria-hidden="true">
          <defs>
            <linearGradient id="mf-fortune-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A99CFF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#A99CFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          {current ? <line x1={current.x} y1={PAD_TOP - 14} x2={current.x} y2={H - PAD_BOTTOM + 8} stroke="#E8A9D8" strokeWidth="1.5" strokeDasharray="5 7" opacity="0.3" /> : null}
          <path d={area} fill="url(#mf-fortune-fill)" stroke="none" />
          <path d={line} fill="none" stroke="#E8A9D8" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {peak.age !== current?.age ? (
            <>
              <circle cx={peak.x} cy={peak.y} r="9" fill="#E8A9D8" opacity="0.35" vectorEffect="non-scaling-stroke" />
              <circle cx={peak.x} cy={peak.y} r="6" fill="#E8A9D8" stroke="#F7F0F2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <text x={peak.x} y={peak.y - 16} textAnchor="middle" className="mf-fortune-label">最高 {peak.age}岁</text>
            </>
          ) : null}
          {low.age !== peak.age && low.age !== current?.age ? (
            <>
              <circle cx={low.x} cy={low.y} r="9" fill="#E8A9D8" opacity="0.35" vectorEffect="non-scaling-stroke" />
              <circle cx={low.x} cy={low.y} r="6" fill="#E8A9D8" stroke="#F7F0F2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <text x={low.x} y={low.y + 48} textAnchor="middle" className="mf-fortune-label">最低 {low.age}岁</text>
            </>
          ) : null}
          {current ? <circle cx={current.x} cy={current.y} r="4.5" fill="#F7F0F2" stroke="#A99CFF" strokeWidth="2" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      </div>
    </section>
  );
}
