// 订阅升级页骨架:与真实页面同构——顶栏返回 + 「套餐/按次」分栏 + 三张套餐卡,
// 布局复用 mf-upgrade-* / mf-zr-topbar 真实类(home.css 已含),加载完成零跳变。
// 没有本文件时回退到 ../loading.tsx(「我的」页骨架),形状与订阅页不符:
// Next 默认预取动态路由恰好只预取最近的 loading 边界,从「我的」点订阅升级
// 时被换进来的正是那个错误形状的骨架。
export default function Loading() {
  return (
    <div className="mf-zr mf-upgrade-page" aria-busy="true" aria-label="正在加载套餐页">
      <div className="mf-zr-topbar" aria-hidden="true">
        <span className="mf-back-link">
          <span className="mf-back-arrow">←</span>
          <i className="mf-skel-ph mf-upg-skel-label" />
        </span>
      </div>
      <div className="mf-upgrade-body">
        <div className="mf-start-seg mf-upgrade-seg" aria-hidden="true">
          <i className="mf-skel-ph mf-upg-skel-tab" />
          <i className="mf-skel-ph mf-upg-skel-tab" />
        </div>
        {[0, 1, 2].map((box) => (
          <div className="mf-upgrade-box" key={box} aria-hidden="true">
            <div className="mf-upgrade-box-body">
              <i className="mf-skel-ph mf-upg-skel-title" />
              <i className="mf-skel-ph mf-upg-skel-desc" />
              <i className="mf-skel-ph mf-upg-skel-perk" />
              <i className="mf-skel-ph mf-upg-skel-perk is-short" />
            </div>
            <div className="mf-upgrade-box-bar">
              <i className="mf-skel-ph mf-upg-skel-price" />
              <i className="mf-skel-ph mf-upg-skel-buy" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
