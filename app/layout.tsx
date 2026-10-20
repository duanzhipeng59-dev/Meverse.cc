import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MeVerse · 读懂 TA 的生辰画像",
    template: "%s · MeVerse",
  },
  description: "基于八字命理生成完整 AI 生辰画像：性格天赋、事业财富、关系家庭、身心节律与大运流年。",
  openGraph: {
    title: "MeVerse · 读懂 TA 的生辰画像",
    description: "偶像 AI 生辰画像，基于八字命理引擎生成。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "MeVerse · 读懂 TA 的生辰画像",
    description: "偶像 AI 生辰画像，基于八字命理引擎生成。",
  },
};

// 根布局保持纯服务端:认证/语言 Provider 只挂到真正需要的子布局,
// 公开首页因此不再请求 /api/auth/session,也不加载 i18n 翻译数据。
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.svg?v=8" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg?v=8" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
