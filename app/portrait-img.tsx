"use client";

import { PORTRAIT_SIZES, portraitImage, portraitSrcSet } from "./myfate-image";

// 明星卡片肖像:WebP 响应式 + 懒加载 + 失败降级。事件处理器需要客户端组件。
// 淡入不能成为显示的必要条件:缓存命中的图片在挂载时可能已 complete(不会再触发 onLoad),
// 因此 ref 挂载时同步检查 complete 并直接标记 data-loaded。
export default function PortraitImg({
  src,
  alt,
  priority = false,
  sizes = PORTRAIT_SIZES,
  width = 360,
  height = 468,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
}) {
  return (
    <img
      className="mf-bz-cover-img"
      ref={(img) => {
        if (img && img.complete && img.naturalWidth > 0) img.dataset.loaded = "1";
      }}
      onLoad={(event) => { event.currentTarget.dataset.loaded = "1"; }}
      src={portraitImage(src, 360)}
      srcSet={portraitSrcSet(src)}
      sizes={sizes}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={(event) => {
        const img = event.currentTarget;
        if (img.dataset.fallback) return;
        img.dataset.fallback = "1";
        img.srcset = "";
        img.src = "/historical-figure.svg";
      }}
    />
  );
}
