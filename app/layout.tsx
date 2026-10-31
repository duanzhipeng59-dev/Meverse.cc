import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SITE_URL } from "./site-url";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MeVerse · 读懂你的生辰画像",
    template: "%s · MeVerse",
  },
  description: "基于八字命理生成完整 AI 生辰画像：性格天赋、事业财富、关系家庭、身心节律与大运流年。",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MeVerse · 读懂你的生辰画像",
    description: "偶像 AI 生辰画像，基于八字命理引擎生成。",
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "MeVerse",
    images: [{ url: "/og-meverse.jpg", width: 1602, height: 982, alt: "MeVerse · AI 生辰画像" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MeVerse · 读懂你的生辰画像",
    description: "偶像 AI 生辰画像，基于八字命理引擎生成。",
    images: ["/og-meverse.jpg"],
  },
};

// 根布局保持纯服务端:认证/语言 Provider 只挂到真正需要的子布局,
// 公开首页因此不再请求 /api/auth/session,也不加载 i18n 翻译数据。
// GA4 只在配置了 NEXT_PUBLIC_GA_ID 时加载(本地不配即静默);增强型衡量自动追踪
// SPA 路由切换的 page_view,业务事件见 app/ga.ts 与 app/ga-measurement.ts。
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.png?v=9" type="image/png" sizes="64x64" />
        <link rel="shortcut icon" href="/favicon-180.png?v=9" type="image/png" sizes="64x64" />
        <link rel="apple-touch-icon" href="/favicon-180.png?v=9" sizes="180x180" />
      </head>
      <body>
        {children}
        {GA_ID ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
