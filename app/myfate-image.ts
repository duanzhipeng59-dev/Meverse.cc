// 肖像图片地址:统一走本站 /portrait/ 同源代理(Cloudflare 边缘缓存),
// 代理再取 Supabase 的 WebP 缩放版,替代直连 supabase.co 原图(对部分访客 2.4~3s/张)。
// 原图 875KB → 360w WebP 约 12KB;仅处理自家 storage 公开地址,本地/外链原样返回。

const OBJECT_PREFIX = "/storage/v1/object/public/";

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

// 响应式 srcset:240w/360w/520w,由浏览器按卡片实际宽度选择。
export function portraitSrcSet(objectUrl: string) {
  return PORTRAIT_WIDTHS.map((width) => `${portraitImage(objectUrl, width)} ${width}w`).join(", ");
}

// 明星列表卡片尺寸提示:手机单列约半屏宽,桌面约 300px。
export const PORTRAIT_SIZES = "(max-width: 640px) 50vw, 320px";
