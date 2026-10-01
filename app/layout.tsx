import type { Metadata } from "next";
import "./globals.css";
import "./myfate.css";
import { AuthProvider } from "./auth-context";
import { LanguageProvider } from "./language-context";

export const metadata: Metadata = {
  title: {
    default: "Myfate · 看见 TA 的正缘模样",
    template: "%s · Myfate",
  },
  description: "基于八字命理为偶像生成正缘分析报告：人生画像、配偶特征、婚恋大运与感情流年，还可以继续追问。",
  openGraph: {
    title: "Myfate · 看见 TA 的正缘模样",
    description: "偶像正缘分析报告，基于八字命理生成。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Myfate · 看见 TA 的正缘模样",
    description: "偶像正缘分析报告，基于八字命理生成。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.svg?v=7" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg?v=7" type="image/svg+xml" />
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
