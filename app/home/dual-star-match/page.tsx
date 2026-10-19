import type { Metadata } from "next";
import ReadingHub from "./reading-hub";

// 解读页:单人解读/双人合盘两个入口(弹窗填写信息排盘) + 生成记录(自填与偶像合盘合并)。
// 页面壳静态化,记录数据由 ReadingHub 客户端按登录态拉取。
export const revalidate = 300;
export const metadata: Metadata = { title: "生辰解读" };

export default function DualStarMatchPage() {
  return (
    <div className="mf-workspace-content mf-reading-page">
      <header className="mf-reading-head">
        <h1>生辰解读</h1>
        <p>财富与事业高度，适合的行业取向，大运流年的总体评价</p>
      </header>
      <ReadingHub />
    </div>
  );
}
