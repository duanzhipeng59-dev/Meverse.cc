"use client";

import { PORTRAIT_SIZES, portraitImage, portraitSrcSet } from "./myfate-image";

// 明星卡片肖像:WebP 响应式 + 懒加载 + 失败降级。事件处理器需要客户端组件。
export default function PortraitImg({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return (
    <img
      className="mf-bz-cover-img"
      src={portraitImage(src, 360)}
      srcSet={portraitSrcSet(src)}
      sizes={PORTRAIT_SIZES}
      alt={alt}
      width={360}
      height={468}
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
