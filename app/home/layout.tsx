import type { Metadata } from "next";
import type { ReactNode } from "react";
import WorkspaceShell from "./workspace-shell";
import { routeCssHref } from "../route-css-version";

import { AuthProvider } from "../auth-context";

export const metadata: Metadata = {
  // 模板让子页面(人物列表、人物预览)的标题统一带上 MeVerse 后缀
  title: { default: "生辰画像", template: "%s · MeVerse" },
  description: "MeVerse 生辰解读工作台",
};

export default async function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* 路由级 CSS:vinext 不支持 CSS 分包,link 按需加载(React 19 自动提升去重);href 带文件版本参数,改动即失效缓存 */}
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式 */}
      <link rel="stylesheet" href={routeCssHref("home.css")} precedence="default" />
      {/* 工作台品牌 logo 是 CSS 背景图,请求要等样式解析+布局后才发起,晚于内容出现;
          preload 让它在 HTML 解析期就开始拉取(17KB 无损,首屏内容前就绪)。
          URL 必须与 home.css 里的 background url 完全一致(含查询串),否则缓存键不同 preload 不生效 */}
      <link rel="preload" as="image" href="/meverse-logo-nav.webp" fetchPriority="high" />
      <AuthProvider>
        <WorkspaceShell>{children}</WorkspaceShell>
      </AuthProvider>
    </>
  );
}
