import type { Metadata } from "next";
import ReadingHub from "./reading-hub";
import Trans from "../../trans";

// 解读页:单人解读/双人合盘两个入口(弹窗填写信息排盘) + 自填生成记录。
// 页面壳静态化,记录数据由 ReadingHub 客户端按登录态拉取。
export const revalidate = 300;
export const metadata: Metadata = { title: "生辰解读", robots: { index: false, follow: false } };

export default function DualStarMatchPage() {
  return (
    <div className="mf-workspace-content mf-reading-page">
      <header className="mf-reading-head">
        <h1><Trans k="match.page.title" /></h1>
        <p><Trans k="match.page.desc" /></p>
      </header>
      <ReadingHub />
    </div>
  );
}
