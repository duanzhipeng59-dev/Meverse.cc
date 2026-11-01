import { SkeletonBlock } from "../../skeletons";

// 预览页加载骨架:复刻真实页面的新比例——大容器(全宽+左右 padding) > 顶栏(外扩满宽)
// > 人物卡(头像+文案两栏) > 摘要/章节区块。与页面同构,切换零跳变。
export default function CelebrityReportLoading() {
  return (
    <div className="mf-workspace-content" aria-busy="true" aria-label="正在加载人物画像">
      <div className="mf-preview mf-preview-skeleton">
        <div className="mf-zr-topbar" aria-hidden="true">
          <SkeletonBlock className="mf-skel-backarrow" />
          <SkeletonBlock className="is-line w-40" />
          <SkeletonBlock className="mf-report-skeleton-share" />
        </div>
        <header className="mf-preview-hero" aria-hidden="true">
          <SkeletonBlock className="mf-preview-skel-portrait" />
          <div className="mf-preview-head-copy">
            <SkeletonBlock className="is-line w-40" />
            <SkeletonBlock className="is-line w-24" />
            <SkeletonBlock className="is-line w-60" />
            <SkeletonBlock className="is-line w-70" />
            <div className="mf-preview-skel-tags"><SkeletonBlock className="is-tag" /><SkeletonBlock className="is-tag" /></div>
          </div>
        </header>
        {Array.from({ length: 3 }).map((_, index) => (
          <section className="mf-preview-section" aria-hidden="true" key={index}>
            <SkeletonBlock className="is-line w-32" />
            <div className="mf-preview-skel-card">
              <SkeletonBlock className="is-line w-24" />
              <SkeletonBlock className="is-line w-100" />
              <SkeletonBlock className="is-line w-90" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
