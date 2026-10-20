import Link from "next/link";
import SimpleShareButton from "./components/share-button-simple";

// 两类报告页与双星合盘报告共用顶栏:左返回 + 可选右分享(showShare)。
// 返回规则:显式 backHref 优先(如从其他报告"继续探索"跳入,回上一份报告);从浏览记录进入(from=reports)回浏览记录;否则回探索页。
// 传 title 时返回按钮显示「← 名字 / 四柱」双行身份块;secondary 为第二行同级名字(合盘双排),否则退回旧文字链接。
export default function ReportTopbar({ fromReports = false, backHref, backLabel = "返回生辰画像", title, secondary, subtitle, showShare = false, shareTitle }: { fromReports?: boolean; backHref?: string; backLabel?: string; title?: string; secondary?: string; subtitle?: string; showShare?: boolean; shareTitle?: string }) {
  const href = backHref ?? (fromReports ? "/home/reports" : "/home/relationship-test");
  return (
    <div className="mf-zr-topbar">
      <Link className="mf-back-link" href={href} aria-label={backLabel || "返回"}>
        <span className="mf-back-arrow" aria-hidden="true">←</span>
        {title ? (
          <span className="mf-topbar-id">
            <b>{title}</b>
            {secondary ? <b>{secondary}</b> : null}
            {subtitle ? <small>{subtitle}</small> : null}
          </span>
        ) : (
          backLabel ? (
            <>
              <span className="mf-topbar-label">{backLabel}</span>
              <span className="mf-topbar-label-short">{backLabel}</span>
            </>
          ) : null
        )}
      </Link>
      {showShare ? <SimpleShareButton title={shareTitle ?? title ?? "MeVerse 报告"} /> : null}
    </div>
  );
}
