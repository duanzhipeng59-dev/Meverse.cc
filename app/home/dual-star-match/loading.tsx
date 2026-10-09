// 双人合盘入口页骨架:选择器双人卡轮廓 + 历史横条轮廓,进入页面立即出现加载反馈。
// 复用 mf-skel 骨架体系(bazi 暖色主题)。
export default function Loading() {
  return (
    <div className="mf-skel mf-skel-bazi" aria-busy="true" aria-label="正在加载双人合盘">
      {/* 选择器双人卡:两张头像占位 + 操作条 */}
      <div className="mf-skel-hero">
        <i className="skel-portrait" />
        <i className="skel-portrait" />
        <div className="mf-skel-hero-copy">
          <i className="skel-bar w-32" />
          <i className="skel-bar w-60" />
          <i className="skel-bar w-80" />
        </div>
      </div>
      {/* 历史合盘横条 */}
      {[0, 1, 2].map((index) => (
        <div className="mf-skel-card" key={index}>
          <i className="skel-line" />
        </div>
      ))}
      <p className="mf-skel-status">正在加载双人合盘…</p>
    </div>
  );
}
