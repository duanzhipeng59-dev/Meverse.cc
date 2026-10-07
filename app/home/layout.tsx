import type { Metadata } from "next";
import type { ReactNode } from "react";
import WorkspaceShell from "./workspace-shell";

import { isUpgradesEnabled } from "../myfate-settings";
import { AuthProvider } from "../auth-context";

export const metadata: Metadata = {
  title: "工作台",
  description: "Myfate 明星合盘与个人解读工作台",
};

export default async function HomeLayout({ children }: { children: ReactNode }) {
  // 功能开关读取带 5 分钟缓存与并发去重,命中时不访问 app_settings 表。
  const upgradesEnabled = await isUpgradesEnabled();
  return (
    <>
      {/* 路由级 CSS:vinext 不支持 CSS 分包,link 按需加载(React 19 自动提升去重) */}
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式 */}
      <link rel="stylesheet" href="/route-css/home.css" precedence="default" />
      <AuthProvider>
        <WorkspaceShell upgradesEnabled={upgradesEnabled}>{children}</WorkspaceShell>
      </AuthProvider>
    </>
  );
}
