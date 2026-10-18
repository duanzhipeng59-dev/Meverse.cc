// 报告库骨架:与真实页面同构——头部(小标/大标/说明)+分类标签行+搜索筛选工具栏+报告卡列表,
// 布局复用 mf-hist-*/mf-lib-toolbar 真实类,加载完成零跳变。
export default function Loading() {
  return (
    <div className="mf-workspace-content">
      <div className="mf-hist mf-hist-skel" aria-busy="true" aria-label="正在加载报告库">
        <header className="mf-hist-head" aria-hidden="true">
          <div>
            <i className="mf-skel-ph mf-hist-skel-kicker" />
            <i className="mf-skel-ph mf-hist-skel-h1" />
            <i className="mf-skel-ph mf-hist-skel-desc" />
          </div>
        </header>

        <nav className="mf-hist-tabs" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <i className="mf-skel-ph mf-hist-skel-pill" key={index} />
          ))}
        </nav>

        <div className="mf-lib-toolbar" aria-hidden="true">
          <i className="mf-skel-ph mf-hist-skel-input" />
          <i className="mf-skel-ph mf-hist-skel-pill is-long" />
        </div>

        <div className="mf-hist-skel-list" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="mf-hist-skel-card" key={index}>
              <i className="mf-skel-ph mf-hist-skel-bar is-title" />
              <i className="mf-skel-ph mf-hist-skel-bar" />
              <i className="mf-skel-ph mf-hist-skel-bar is-short" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
