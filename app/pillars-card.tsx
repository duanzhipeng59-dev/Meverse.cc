// 四柱板块:柱名标签 + 干支竖排的独立卡片,明星报告与个人解读报告共用
const PILLAR_LABELS = ["年柱", "月柱", "日柱", "时柱"];

export default function PillarsCard({ pillars, hourEstimated }: { pillars: string[]; hourEstimated?: boolean }) {
  return (
    <section className="mf-zr-card mf-pillars-card" aria-label="四柱排盘">
      <div className="mf-zr-section-head mf-sr-head"><div><h2><i aria-hidden="true">☰</i>四柱</h2></div></div>
      <div className="mf-zr-hero-pillars" aria-label="四柱">
        {pillars.map((ganzhi, index) => (
          <span key={`${ganzhi}-${index}`}>
            <small>{hourEstimated && index === 3 ? "时柱·推算" : PILLAR_LABELS[index] ?? "柱"}</small>
            <b>{ganzhi}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
