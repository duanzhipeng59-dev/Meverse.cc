import Link from "next/link";
import ShareButton from "./share-button";

// 两类报告页与双星合盘报告共用顶栏:左返回 + 右分享。
// 返回规则:显式 backHref 优先;否则从浏览记录进入(from=reports)回浏览记录主页,否则回对应明星详情页。
export default function ReportTopbar({ starId, fromReports = false, backHref, backLabel = "返回明星解读" }: { starId?: string; fromReports?: boolean; backHref?: string; backLabel?: string }) {
  const href = backHref ?? (fromReports ? "/home/reports" : `/home/relationship-test/${starId}`);
  return (
    <div className="mf-zr-topbar">
      <Link className="mf-back-link" href={href} aria-label={backLabel}>
        <span aria-hidden="true">←</span>
        <span className="mf-topbar-label">{backLabel}</span>
        <span className="mf-topbar-label-short">返回</span>
      </Link>
      <ShareButton />
    </div>
  );
}
