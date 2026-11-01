"use client";

import { useLanguage } from "./language-context";

// 服务端组件里取翻译的最小客户端单元:SSR 渲染简中,水合后按 localStorage 偏好切换(简繁同字重排,无布局跳动)。
// 客户端组件请直接 useLanguage().t(),不要经由本组件。
export default function Trans({ k, params }: { k: string; params?: Record<string, string | number> }) {
  return <>{useLanguage().t(k, params)}</>;
}
