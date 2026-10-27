// 报告页加载骨架:暖色(生辰)主题,循环动画,5 秒后浮现耐心提示。
export default function SkelReport() {
  return (
    <div className="mf-skel mf-skel-bazi" aria-busy="true" aria-label="正在读取命盘数据">
      {/* 顶栏轮廓:吸顶满宽,左=返回+身份块,右=分享胶囊 */}
      <div className="mf-skel-topbar">
        <span className="mf-skel-backarrow" aria-hidden="true" />
        <span className="mf-skel-backid"><i className="skel-bar w-24" /><i className="skel-bar w-20" /></span>
        <i className="mf-skel-share" />
      </div>
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
