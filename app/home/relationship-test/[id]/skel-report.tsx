// 报告页加载骨架:暖色(生辰)/深紫(星盘)双主题,循环动画,5 秒后浮现耐心提示。
export default function SkelReport({ theme }: { theme: "bazi" | "astrology" }) {
  return (
    <div className={`mf-skel mf-skel-${theme}`} aria-busy="true" aria-label="正在读取命盘数据">
      <div className="mf-skel-topbar"><i className="skel-bar w-24" /><i className="skel-bar w-20" /></div>
      <div className="mf-skel-hero">
        <i className="skel-portrait" />
        <div className="mf-skel-hero-copy">
          <i className="skel-bar w-32" />
          <i className="skel-bar w-60" />
          <i className="skel-bar w-80" />
          <div className="mf-skel-pillars"><i /><i /><i /><i /></div>
        </div>
      </div>
      {[0, 1, 2, 3].map((index) => (
        <div className="mf-skel-card" key={index}>
          <i className="skel-bar w-40" />
          <i className="skel-line" />
          <i className="skel-line short" />
          <i className="skel-line short" />
        </div>
      ))}
      <p className="mf-skel-status">正在读取命盘数据…</p>
      <p className="mf-skel-patience">报告内容较为详细，请稍候片刻</p>
    </div>
  );
}
