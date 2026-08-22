import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./auth-context";
import { LanguageProvider } from "./language-context";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.wildgpt.org"),
  title: "WildGPT",
  description: "Gemini Pro 与家庭组套餐，支持支付宝。",
  openGraph: {
    title: "WildGPT - Gemini Pro / 家庭组订阅",
    description: "Gemini Pro 与家庭组套餐，支持支付宝。",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WildGPT - Gemini Pro / 家庭组订阅",
    description: "Gemini Pro 与家庭组套餐，支持支付宝。",
    images: ["/og.png"],
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
        <link rel="icon" href="/favicon.svg?v=3" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg?v=3" type="image/svg+xml" />
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
