// 合盘报告页加载骨架:与真实页面同构——顶栏 + 双人 hero(两人像+文案区,移动端自动单列)+ 章节卡轮廓。
// hero 复用 mf-dual-report-hero 真实布局类,加载完成零跳变。
export default function Loading() {
  return (
    <div className="mf-skel mf-skel-bazi" aria-busy="true" aria-label="正在读取合盘数据">
      <div className="mf-skel-topbar">
        <span className="mf-skel-backarrow" aria-hidden="true" />
        <span className="mf-skel-backid"><i className="skel-bar w-24" /><i className="skel-bar w-20" /></span>
        <i className="mf-skel-share" />
      </div>
      <header className="mf-dual-report-hero mf-dual-report-skel" aria-hidden="true">
        <div className="mf-dual-report-people">
          <figure>
            <i className="mf-skel-ph mf-dual-report-skel-face" />
            <figcaption><i className="mf-skel-ph mf-dual-report-skel-caption" /></figcaption>
          </figure>
          <span aria-hidden="true">×</span>
          <figure>
            <i className="mf-skel-ph mf-dual-report-skel-face" />
            <figcaption><i className="mf-skel-ph mf-dual-report-skel-caption" /></figcaption>
          </figure>
        </div>
        <div className="mf-dual-report-copy">
          <i className="mf-skel-ph mf-dual-report-skel-kicker" />
          <i className="mf-skel-ph mf-dual-report-skel-h1" />
          <i className="mf-skel-ph mf-dual-report-skel-line" />
          <i className="mf-skel-ph mf-dual-report-skel-line is-short" />
        </div>
      </header>
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
