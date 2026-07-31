import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "ChatGPT Plus / Claude Pro 订阅价格与套餐 - WildAI",
    description:
      "ChatGPT Plus、Claude Pro、Gemini 与 X 套餐。独立账号非合租，支持微信支付宝。",
    openGraph: {
      title: "WildAI - AI 服务订阅",
      description: "ChatGPT、Claude、Gemini 与 X 套餐，一站式轻松订阅。",
      type: "website",
      locale: "zh_CN",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "WildAI - AI 服务订阅",
      description: "ChatGPT、Claude、Gemini 与 X 套餐，一站式轻松订阅。",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
