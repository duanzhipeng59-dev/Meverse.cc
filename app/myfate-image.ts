// 肖像图片地址:优先用预生成的静态变体(public/portraits/,scripts/gen-portrait-variants.mjs),
// 走 Vercel 全局静态 CDN——无函数回源、无 Supabase 依赖,冷 POP 也不再有秒级尾延迟。
// 未命中清单(新加明星还没跑脚本)回退 /portrait/ 同源代理(边缘缓存 + Supabase render)。
// 原图 875KB → 360w WebP 约 12KB;仅处理自家 storage 公开地址,本地/外链原样返回。

import { STATIC_PORTRAITS } from "./portrait-static-manifest";

const OBJECT_PREFIX = "/storage/v1/object/public/";
const STATIC_WIDTHS = new Set([120, 240, 360, 520]);

// 卡片固定比例 3/3.9(10:13),与 .mf-bz-star-cover 的 aspect-ratio 一致。
export const PORTRAIT_WIDTHS = [240, 360, 520] as const;

function renderUrl(objectUrl: string, params: Record<string, string | number>) {
  if (!objectUrl || !/^https?:\/\//u.test(objectUrl)) return objectUrl;
  let url: URL;
  try {
    url = new URL(objectUrl);
  } catch {
    return objectUrl;
  }
  const marker = url.pathname.indexOf(OBJECT_PREFIX);
  if (marker < 0) return objectUrl;
  const objectPath = url.pathname.slice(marker + OBJECT_PREFIX.length);
  // 静态变体优先:仅 WebP 卡片尺寸(og 图保持代理回源格式)
  const stem = (objectPath.split("/").pop() ?? "").replace(/\.[a-z0-9]+$/i, "");
  const width = Number(params.width);
  if (params.format === "webp" && STATIC_WIDTHS.has(width) && STATIC_PORTRAITS.has(stem)) {
    return `/portraits/${stem}.w${width}.webp`;
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) query.set(key, String(value));
  return `/portrait/${objectPath}?${query.toString()}`;
}

// 单尺寸转换地址(宽 360 起步,竖版海报按 10:13 裁切)。
export function portraitImage(objectUrl: string, width = 360) {
  return renderUrl(objectUrl, {
    width,
    height: Math.round((width * 13) / 10),
    resize: "cover",
    quality: 75,
    format: "webp",
  });
}

// 分享卡(og:image)用:不传 format 让代理回源格式(源图为 JPEG),
// 微信/WhatsApp 等抓取器不支持 WebP 分享图;保持 10:13 原比例避免裁掉人脸。
export function portraitOgImage(objectUrl: string) {
  return renderUrl(objectUrl, { width: 1200, height: 1560, resize: "cover", quality: 80 });
}

// 响应式 srcset:240w/360w/520w,由浏览器按卡片实际宽度选择。
export function portraitSrcSet(objectUrl: string) {
  return PORTRAIT_WIDTHS.map((width) => `${portraitImage(objectUrl, width)} ${width}w`).join(", ");
}

// 明星列表卡片尺寸提示:手机单列约半屏宽,桌面约 300px。
export const PORTRAIT_SIZES = "(max-width: 640px) 50vw, 320px";
