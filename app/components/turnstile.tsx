"use client";

// Cloudflare Turnstile 无感人机验证(护发码接口防机器人刷邮件):
// - 未配置 NEXT_PUBLIC_TURNSTILE_SITE_KEY 时完全不渲染、token 恒为 null(本地/未启用照旧)
// - token 一次性且约 5 分钟过期:消费后由父组件换 key 重挂载取新 token
import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function turnstileConfigured() {
  return Boolean(SITE_KEY);
}

export default function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY || !holder.current) return;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !holder.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(holder.current, {
        sitekey: SITE_KEY,
        theme: "dark",
        callback: (token: string) => onToken(token),
        // 过期/出错都交回 null,父组件在下次发送时以新 key 重挂载重新取 token
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      // 官方脚本全站只注入一次
      if (!document.querySelector("script[data-turnstile]")) {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.dataset.turnstile = "true";
        script.onload = renderWidget;
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div className="mf-turnstile" ref={holder} />;
}
