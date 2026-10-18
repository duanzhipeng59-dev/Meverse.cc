"use client";

import Image from "next/image";
import Link from "next/link";
import { portraitImage } from "../../myfate-image";

// 待生成横条:进过确认页但还没点「开始分析」的组合,点击回到确认页继续;
// 删除只动本地记录,无不可恢复风险,不弹确认条。
export default function DualPendingRow({ a, b, portraitA, portraitB, title, time, onRemoved }: {
  a: string;
  b: string;
  portraitA: string;
  portraitB: string;
  title: string;
  time: string;
  onRemoved: () => void;
}) {
  return (
    <div className="mf-dual-history-row-wrap">
      <Link className="mf-dual-history-row" href={`/home/dual-star-match/new/${encodeURIComponent(a)}/${encodeURIComponent(b)}`}>
        <span className="mf-dual-history-avatars">
          <Image src={portraitImage(portraitA, 120)} alt="" width={30} height={39} unoptimized />
          <i aria-hidden="true">&amp;</i>
          <Image src={portraitImage(portraitB, 120)} alt="" width={30} height={39} unoptimized />
        </span>
        <b>{title}</b>
        <span className="mf-dual-history-meta is-stacked">
          <small>{time}</small>
          <em data-status="pending">待生成</em>
        </span>
      </Link>
      <button type="button" className="mf-dual-history-del" onClick={onRemoved} aria-label={`删除 ${title} 的待生成记录`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 7h16" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7" />
          <path d="M10.2 11v5M13.8 11v5" />
        </svg>
      </button>
    </div>
  );
}
