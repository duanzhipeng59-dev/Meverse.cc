import Link from "next/link";
import ShareButton from "./share-button";

// 两类报告页共用顶栏:左返回 + 右分享。
// 返回规则:从浏览记录进入(from=reports)回浏览记录主页,否则回对应明星详情页。
export default function ReportTopbar({ starId, fromReports = false }: { starId: string; fromReports?: boolean }) {
  const backHref = fromReports ? "/home/reports" : `/home/relationship-test/${starId}`;
  return (
    <div className="mf-zr-topbar">
      <Link className="mf-back-link" href={backHref} aria-label="返回明星解读">
        <span aria-hidden="true">←</span>
        <span className="mf-topbar-label">返回明星解读</span>
        <span className="mf-topbar-label-short">返回</span>
      </Link>
      <ShareButton />
    </div>
  );
}
