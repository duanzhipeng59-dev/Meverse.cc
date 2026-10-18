// 双人合盘入口页骨架:与真实页面同构——标题/双人槽卡/交换位/生成按钮,
// 布局复用 mf-dual-* 真实类,占位块尺寸对齐真实组件,加载完成零跳变。
// 页面容器 .mf-workspace-content 由各 page 自带,骨架同样需要,否则移动端失去 20px 边距。
export default function Loading() {
  return (
    <div className="mf-workspace-content mf-dual-page">
      <div className="mf-dual mf-dual-skel" aria-busy="true" aria-label="正在加载双人合盘">
        <header className="mf-dual-head" aria-hidden="true">
          <i className="mf-skel-ph mf-dual-skel-title" />
          <i className="mf-skel-ph mf-dual-skel-sub" />
        </header>

        <section className="mf-dual-relation" aria-hidden="true">
          <div className="mf-dual-node is-skel">
            <i className="mf-skel-ph skel-portrait" />
            <i className="mf-skel-ph skel-bar" />
            <i className="mf-skel-ph skel-bar" />
          </div>
          <div className="mf-dual-link">
            <span className="mf-skel-ph mf-dual-skel-swap" />
          </div>
          <div className="mf-dual-node is-skel">
            <i className="mf-skel-ph skel-portrait" />
            <i className="mf-skel-ph skel-bar" />
            <i className="mf-skel-ph skel-bar" />
          </div>
        </section>

        <div className="mf-dual-cta-zone" aria-hidden="true">
          <div className="mf-dual-actions">
            <span className="mf-skel-ph mf-dual-skel-generate" />
          </div>
        </div>
      </div>
    </div>
  );
}
