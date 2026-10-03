"use client";

import { useState } from "react";

// 报告顶部分享:点击短暂加载后复制当前链接并提示。
export default function ShareButton() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function share() {
    if (state !== "idle") return;
    setState("loading");
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const helper = document.createElement("textarea");
        helper.value = url;
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
    } catch {
      // 剪贴板不可用时退化为直接提示(地址栏可见链接)
    }
    window.setTimeout(() => setState("done"), 350);
    window.setTimeout(() => setState("idle"), 2200);
  }

  return (
    <button type="button" className="mf-zr-share" onClick={() => void share()} aria-live="polite">
      {state === "loading" ? <><i className="mf-launch-spinner" aria-hidden="true" />正在复制…</> : state === "done" ? "✓ 链接已复制" : "分享"}
    </button>
  );
}
