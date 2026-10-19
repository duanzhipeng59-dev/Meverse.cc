// 解读页骨架:与真实页面同构——标题区 + 两张入口卡占位 + 记录区占位,加载完成零跳变。
export default function Loading() {
  return (
    <div className="mf-workspace-content mf-reading-page" aria-busy="true" aria-label="正在加载解读页">
      <header className="mf-reading-head" aria-hidden="true">
        <div className="mf-skel-ph" style={{ width: 96, height: 26 }} />
        <div className="mf-skel-ph" style={{ width: 220, height: 14, marginTop: 10 }} />
      </header>
      <div className="mf-reading-cards" aria-hidden="true">
        <div className="mf-reading-card is-single" style={{ cursor: "default" }}>
          <i className="mf-reading-card-mark mf-skel-ph" style={{ width: 44, height: 44 }} />
          <span className="mf-reading-card-copy">
            <b className="mf-skel-ph" style={{ width: 72, height: 18 }} />
            <small className="mf-skel-ph" style={{ width: 180, height: 12 }} />
          </span>
        </div>
        <div className="mf-reading-card is-dual" style={{ cursor: "default" }}>
          <i className="mf-reading-card-mark mf-skel-ph" style={{ width: 44, height: 44 }} />
          <span className="mf-reading-card-copy">
            <b className="mf-skel-ph" style={{ width: 72, height: 18 }} />
            <small className="mf-skel-ph" style={{ width: 180, height: 12 }} />
          </span>
        </div>
      </div>
      <section className="mf-reading-records" aria-hidden="true">
        <h2 className="mf-skel-ph" style={{ width: 64, height: 14 }} />
        <div className="mf-reading-record-list">
          {[0, 1].map((index) => (
            <div className="mf-reading-row" key={index} style={{ cursor: "default" }}>
              <span className="mf-reading-row-main">
                <b className="mf-skel-ph" style={{ width: 120, height: 15 }} />
                <small className="mf-skel-ph" style={{ width: 56, height: 11 }} />
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
