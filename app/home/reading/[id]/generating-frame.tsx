export const GENERATING_PHASES = ["正在排定命盘…", "正在分析十神格局…", "正在撰写章节解读…", "正在整理大运流年…"];

// 生成中的静态首帧(呼吸星标 + 起始进度条 + 阶段文案):路由 loading 与生成页的 SSR 首帧共用,
// 三段过渡(loading → 页面首帧 → 计时动画)视觉完全一致,消除骨架闪跳。
export default function GeneratingFrame() {
  return (
    <div className="mf-dual-status">
      <span className="mf-dual-star" aria-hidden="true">✦</span>
      <div className="mf-dual-progress is-real" aria-hidden="true">
        <span className="mf-dual-progress-fill" style={{ width: "2%" }} />
      </div>
      <p className="mf-dual-status-note">{GENERATING_PHASES[0]}</p>
    </div>
  );
}
