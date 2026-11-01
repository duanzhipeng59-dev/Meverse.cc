// 四柱板块:柱名标签 + 干支竖排的独立卡片,明星报告与个人解读报告共用。
// labels 可选:繁中场景由客户端包装层传翻译后的标签;缺省保持简体(服务端直用)。
const PILLAR_LABELS = ["年柱", "月柱", "日柱", "时柱"];

export type PillarsLabels = { aria: string; title: string; list: string[]; hour: string; fallback: string };

export default function PillarsCard({ pillars, hourEstimated, labels }: { pillars: string[]; hourEstimated?: boolean; labels?: PillarsLabels }) {
  const l = labels ?? { aria: "四柱排盘", title: "四柱", list: PILLAR_LABELS, hour: "时柱·推算", fallback: "柱" };
  return (
    <section className="mf-zr-card mf-pillars-card" aria-label={l.aria}>
      <div className="mf-zr-section-head mf-sr-head"><div><h2><i aria-hidden="true">☰</i>{l.title}</h2></div></div>
      <div className="mf-zr-hero-pillars" aria-label={l.title}>
        {pillars.map((ganzhi, index) => (
          <span key={`${ganzhi}-${index}`}>
            <small>{hourEstimated && index === 3 ? l.hour : l.list[index] ?? l.fallback}</small>
            <b>{ganzhi}</b>
          </span>
        ))}
      </div>
    </section>
  );
}
