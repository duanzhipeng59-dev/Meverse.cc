"use client";

import { useState } from "react";

// 顶栏分享:navigator.share 优先,剪贴板兜底+toast 反馈(与人物预览页操作区同一套逻辑)。
export default function SimpleShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · Myfate`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* 用户取消 */ }
  };

  return (
    <button type="button" className="mf-topbar-share" aria-label="分享" onClick={() => void share()}>
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 15V4M8.5 7 12 3.5 15.5 7M5.5 12v6.5A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V12" /></svg>
      )}
    </button>
  );
}
