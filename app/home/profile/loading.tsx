// 我的页骨架:与真实页面同构——账户卡(头像/两行文案/胶囊按钮)+两组「标题+人物横排卡」,
// 布局复用 mf-me-* 真实类,加载完成零跳变。
export default function Loading() {
  return (
    <div className="mf-workspace-content">
      <div className="mf-me mf-me-skel" aria-busy="true" aria-label="正在加载个人中心">
        <section className="mf-me-account" aria-hidden="true">
          <div className="mf-me-account-copy">
            <i className="mf-skel-ph mf-me-skel-line is-title" />
            <i className="mf-skel-ph mf-me-skel-line is-sub" />
          </div>
          <i className="mf-skel-ph mf-me-skel-btn" />
        </section>

        {[0, 1].map((section) => (
          <section className="mf-me-section" key={section} aria-hidden="true">
            <i className="mf-skel-ph mf-me-skel-h2" />
            <div className="mf-me-row">
              {Array.from({ length: 4 }).map((_, index) => (
                <span className="mf-me-skel-person" key={index}>
                  <i className="mf-skel-ph mf-me-skel-face" />
                  <b className="mf-skel-ph mf-me-skel-name" />
                </span>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
