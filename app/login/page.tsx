import type { Metadata } from "next";
import LocalLogin from "./local-login";
import { routeCssHref } from "../route-css-version";

import { AuthProvider } from "../auth-context";

export const metadata: Metadata = {
  title: "登录",
  description: "使用邮箱验证码登录 MeVerse。",
};

export default function LoginPage() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式;href 带文件版本参数 */}
      <link rel="stylesheet" href={routeCssHref("login.css")} precedence="default" />
      <AuthProvider>
        <LocalLogin />
      </AuthProvider>
    </>
  );
}
