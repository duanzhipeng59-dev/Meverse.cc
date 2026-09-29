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
  description: "选择一位想了解的人，通过关系情境测试，看见你更适合成为 TA 的谁。",
  openGraph: {
    title: "Myfate · 遇见你的心动答案",
    description: "明星合盘分析与关系结构分析。",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Myfate · 遇见你的心动答案",
    description: "明星合盘分析与关系结构分析。",
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
