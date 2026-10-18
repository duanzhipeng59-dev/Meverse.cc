// 发现页骨架:与真实页面同构——控制行(排序标签+搜索icon)+带框人物卡网格(封面/名字/团体/标签),
// 布局复用 mf-explore-* 与 mf-bz-star-card 真实类,加载完成零跳变。
export default function Loading() {
  return (
    <div className="mf-workspace-content">
      <div className="mf-explore mf-explore-skel" aria-busy="true" aria-label="正在加载人物列表">
        <div className="mf-explore-ctrl" aria-hidden="true">
          <nav className="mf-explore-tabs">
            <i className="mf-skel-ph mf-explore-skel-tab" />
            <i className="mf-skel-ph mf-explore-skel-tab" />
            <i className="mf-skel-ph mf-explore-skel-tab" />
          </nav>
          <i className="mf-skel-ph mf-explore-skel-search" />
        </div>

        <div className="mf-explore-grid" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="mf-bz-star-card is-skel" key={index}>
              <i className="mf-skel-ph mf-explore-skel-cover" />
              <i className="mf-skel-ph mf-explore-skel-name" />
              <i className="mf-skel-ph mf-explore-skel-group" />
              <div className="mf-explore-card-tags">
                <i className="mf-skel-ph mf-explore-skel-tag" />
                <i className="mf-skel-ph mf-explore-skel-tag is-wider" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
