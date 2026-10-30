import GeneratingFrame from "./generating-frame";

// 与生成页首帧同构的加载态:点「开始分析」跳转过来时 loading → 生成页无缝衔接,不闪报告骨架。
export default function Loading() {
  return <div className="mf-zr"><GeneratingFrame /></div>;
}
