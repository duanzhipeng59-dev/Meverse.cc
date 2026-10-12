"use client";

import { useEffect } from "react";
import { pushRecentStar } from "../../celebrity-match/celebrity-browser";

// 进入预览页即写入「最近查看」(本地;登录同步属持久化批次)
export default function StarCardScript({ starId }: { starId: string }) {
  useEffect(() => { pushRecentStar(starId); }, [starId]);
  return null;
}
