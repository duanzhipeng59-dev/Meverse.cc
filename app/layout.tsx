import type { Metadata } from "next";
import "./globals.css";
import "./myfate.css";
import { AuthProvider } from "./auth-context";
import { LanguageProvider } from "./language-context";

export const metadata: Metadata = {
  title: {
    default: "Myfate · 遇见你的心动答案",
    template: "%s · Myfate",
  },
  description: "输入出生信息，直接生成吠陀合盘报告与八字个人解读。",
  openGraph: {
    title: "Myfate · 遇见你的心动答案",
    description: "吠陀明星合盘与八字个人解读。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Myfate · 遇见你的心动答案",
    description: "吠陀明星合盘与八字个人解读。",
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
