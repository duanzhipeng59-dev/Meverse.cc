// GA4 客户端事件上报:layout 注入 gtag.js 后生效;未配置/未加载/SSR 时静默丢弃,不影响业务。
type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
  }
}

export function gaEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}
