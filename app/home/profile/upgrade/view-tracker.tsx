"use client";

import { useEffect } from "react";

// 订阅页进入埋点:挂载即上报一次(带来源);失败静默,绝不影响页面渲染。
// 服务端路由落 page_events 表,GA4 之外补一条可逐用户归因的链路。
export default function ViewTracker({ event, source }: { event: string; source: string }) {
  useEffect(() => {
    fetch("/api/track/page", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, source }),
      keepalive: true,
    }).catch(() => {});
  }, [event, source]);
  return null;
}
