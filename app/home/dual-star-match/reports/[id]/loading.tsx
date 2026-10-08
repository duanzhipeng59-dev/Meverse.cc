// 合盘报告页加载骨架:双人 hero + 章节卡轮廓,点击历史记录后立即出现加载反馈。
// 复用明星报告页的 mf-skel 骨架体系(bazi 暖色主题)。
export default function Loading() {
  return (
    <div className="mf-skel mf-skel-bazi" aria-busy="true" aria-label="正在读取合盘数据">
      <div className="mf-skel-topbar">
        <span className="mf-skel-backarrow" aria-hidden="true" />
        <span className="mf-skel-backid"><i className="skel-bar w-24" /><i className="skel-bar w-20" /></span>
        <i className="mf-skel-share" />
      </div>
      <div className="mf-skel-hero">
        {/* 双人合盘:两张头像 + 连接符 */}
        <i className="skel-portrait" />
        <span className="mf-skel-duo-x" aria-hidden="true">×</span>
        <i className="skel-portrait" />
        <div className="mf-skel-hero-copy">
          <i className="skel-bar w-32" />
          <i className="skel-bar w-60" />
          <i className="skel-bar w-80" />
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
      <p className="mf-skel-status">正在读取合盘数据…</p>
      <p className="mf-skel-patience">报告内容较为详细，请稍候片刻</p>
    </div>
  );
}
