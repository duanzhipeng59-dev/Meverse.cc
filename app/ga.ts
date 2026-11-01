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

// 登录后绑定 user_id(UUID,非 PII):之后的 page_view/事件都能按用户分群;
// 服务端 purchase 事件已带同一 id(Measurement Protocol),两端就此打通。
export function gaSetUser(userId: string | null) {
  if (typeof window === "undefined") return;
  window.gtag?.("set", { user_id: userId ?? undefined });
}
