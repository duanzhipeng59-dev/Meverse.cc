import type { Metadata } from "next";
import type { ReactNode } from "react";
import WorkspaceShell from "./workspace-shell";

import { AuthProvider } from "../auth-context";

export const metadata: Metadata = {
  title: "生辰画像",
  description: "Myfate 明星合盘与个人解读工作台",
};

export default async function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* 路由级 CSS:vinext 不支持 CSS 分包,link 按需加载(React 19 自动提升去重) */}
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式 */}
      <link rel="stylesheet" href="/route-css/home.css" precedence="default" />
      <AuthProvider>
        <WorkspaceShell>{children}</WorkspaceShell>
      </AuthProvider>
    </>
  );
}
