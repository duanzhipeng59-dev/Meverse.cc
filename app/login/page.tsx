import type { Metadata } from "next";
import LocalLogin from "./local-login";

export const metadata: Metadata = {
  title: "登录",
  description: "使用邮箱验证码登录 Myfate。",
};

export default function LoginPage() {
  return <LocalLogin />;
}
