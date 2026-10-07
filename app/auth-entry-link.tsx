"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { readLocalSession } from "./local-auth";

// 本地会话变更事件:登录/登出时广播,让同页的入口链接即时同步(跨标签页走 storage 事件)。
const AUTH_CHANGE_EVENT = "myfate-auth-change";

// 首页入口链接:不请求 /api/auth/session,匿名首屏零会话流量。
// 登录态判断延迟到渲染同步读 localStorage(登录时已写入)、点击时兜底:
// 受保护页面的服务端 requirePageUser 仍是最终权限依据,这里只决定落点。
export default function AuthEntryLink({
  href,
  className,
  children,
  anonymousChildren,
  anonymousNext,
  anonymousFrom,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  anonymousChildren?: ReactNode;
  anonymousNext?: string;
  anonymousFrom?: string;
}) {
  const pathname = usePathname();

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(AUTH_CHANGE_EVENT, onStoreChange);
    return () => {
      window.removeEventListener("storage", onStoreChange);
      window.removeEventListener(AUTH_CHANGE_EVENT, onStoreChange);
    };
  }, []);

  // 服务端快照恒为匿名,避免 hydration mismatch;挂载后按本地会话同步(如有)。
  const email = useSyncExternalStore(
    subscribe,
    () => readLocalSession(),
    () => null,
  );
  const authenticated = Boolean(email);
  const target = authenticated
    ? href
    : `/login?next=${encodeURIComponent(anonymousNext ?? href)}&from=${encodeURIComponent(anonymousFrom ?? pathname)}`;

  return (
    <Link className={className} href={target}>
      {!authenticated && anonymousChildren !== undefined ? anonymousChildren : children}
    </Link>
  );
}
