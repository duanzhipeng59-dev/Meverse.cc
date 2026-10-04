"use client";

import { useMemo, useRef, useState } from "react";

type Point = { age: number; score: number };

// 人生运势曲线:SVG 平滑曲线 + 渐变填充,触摸/悬停查看各年龄(数值来自大运打分插值)。
export default function FortuneCurveCard({ points, currentAge }: { points: Point[]; currentAge: number | null }) {
  const [hover, setHover] = useState<(Point & { x: number; y: number }) | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 800;
  const H = 260;
  const PAD_X = 14;
  const PAD_TOP = 46;
  const PAD_BOTTOM = 26;

  const geo = useMemo(() => {
    if (!points.length) return null;
    const minAge = points[0].age;
    const maxAge = points[points.length - 1].age;
    const minScore = Math.min(...points.map((p) => p.score)) - 6;
    const maxScore = Math.max(...points.map((p) => p.score)) + 6;
    const toX = (age: number) => PAD_X + ((age - minAge) / (maxAge - minAge)) * (W - PAD_X * 2);
    const toY = (score: number) => PAD_TOP + (1 - (score - minScore) / (maxScore - minScore)) * (H - PAD_TOP - PAD_BOTTOM);
    const coords = points.map((p) => ({ ...p, x: toX(p.age), y: toY(p.score) }));
    // Catmull-Rom → 三次贝塞尔平滑
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
    const peak = coords.reduce((best, p) => (p.score > best.score ? p : best), coords[0]);
    const low = coords.reduce((best, p) => (p.score < best.score ? p : best), coords[0]);
    return { coords, line, area, peak, low, minAge, maxAge };
  }, [points]);

  const currentX = useMemo(() => {
    if (!geo || currentAge === null || currentAge < geo.minAge || currentAge > geo.maxAge) return null;
    return geo.coords.reduce((best, p) => (Math.abs(p.age - currentAge) < Math.abs(best.age - currentAge) ? p : best), geo.coords[0]);
  }, [geo, currentAge]);

  function onMove(clientX: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !geo) return;
    const x = ((clientX - rect.left) / rect.width) * W;
    const nearest = geo.coords.reduce<(Point & { x: number; y: number })>((best, p) => (Math.abs(p.x - x) < Math.abs(best.x - x) ? p : best), geo.coords[0]);
    setHover(nearest);
  }

  if (!geo) return null;
  const hoverPoint = hover ?? currentX;

  return (
    <section className="mf-zr-card mf-fortune" aria-label="人生运势曲线">
      <div className="mf-fortune-head">
        <h2><i aria-hidden="true">✦</i>人生运势曲线</h2>
        <p>综合事业与财富的一生大致走势（7岁起 ～ 80岁）· 触摸查看各年龄</p>
      </div>
      <div className="mf-fortune-stage">
        {hoverPoint ? (
          <div
            className="mf-fortune-tip"
            style={{ left: `${(hoverPoint.x / W) * 100}%`, top: 0 }}
          >
            {hoverPoint.age}岁 · 运势 {hoverPoint.score}
          </div>
        ) : null}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="mf-fortune-svg"
          onTouchStart={(event) => onMove(event.touches[0].clientX)}
          onTouchMove={(event) => onMove(event.touches[0].clientX)}
          onMouseMove={(event) => onMove(event.clientX)}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="mf-fortune-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B6FD8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8B6FD8" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {/* 当前年龄虚线 */}
          {currentX ? (
            <>
              <line x1={currentX.x} y1={PAD_TOP - 18} x2={currentX.x} y2={H - PAD_BOTTOM} stroke="#B9A6EE" strokeWidth="2" strokeDasharray="7 6" />
              <text x={currentX.x} y={PAD_TOP - 26} textAnchor="middle" className="mf-fortune-label">现在 {currentX.age}岁</text>
            </>
          ) : null}
          {/* 面积 + 曲线 */}
          <path d={geo.area} fill="url(#mf-fortune-fill)" stroke="none" />
          <path d={geo.line} fill="none" stroke="#9B7FE8" strokeWidth="3.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {/* 最高点 */}
          {geo.peak ? (
            <>
              <circle cx={geo.peak.x} cy={geo.peak.y} r="7" fill="#fff" stroke="#8B6FD8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              <text x={geo.peak.x} y={geo.peak.y - 16} textAnchor="middle" className="mf-fortune-label">最高 {geo.peak.age}岁</text>
            </>
          ) : null}
          {/* 低谷点 */}
          {geo.low && geo.low.age !== geo.peak.age ? (
            <>
              <circle cx={geo.low.x} cy={geo.low.y} r="7" fill="#fff" stroke="#8B6FD8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              <text x={geo.low.x} y={geo.low.y + 28} textAnchor="middle" className="mf-fortune-label">低谷 {geo.low.age}岁</text>
            </>
          ) : null}
          {/* 触摸指示 */}
          {hoverPoint ? <circle cx={hoverPoint.x} cy={hoverPoint.y} r="6" fill="#fff" stroke="#C64270" strokeWidth="3" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      </div>
    </section>
  );
}
