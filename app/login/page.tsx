import type { Metadata } from "next";
import LocalLogin from "./local-login";

import { AuthProvider } from "../auth-context";

export const metadata: Metadata = {
  title: "登录",
  description: "使用邮箱验证码登录 Myfate。",
};

export default function LoginPage() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags -- vinext 不支持 CSS 路由分包,link 是唯一按需加载方式 */}
      <link rel="stylesheet" href="/route-css/login.css" precedence="default" />
      <AuthProvider>
        <LocalLogin />
      </AuthProvider>
    </>
  );
}
