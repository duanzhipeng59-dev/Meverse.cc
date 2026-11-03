"use client";

// 首屏 hero 装饰图:加载完成后淡入,避免晚到的图片在其他内容之后"突然闪现"。
// 淡入不能成为显示的必要条件:缓存命中的图片挂载时已 complete(不会再触发 onLoad),
// ref 里同步检查直接标记;CSS 侧另有 3s 兜底动画,JS 失效也能显示。模式同 portrait-img。
export default function HeroArtImg({
  src,
  alt,
  width,
  height,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  return (
    <img
      className="mf-home-hero-art-img"
      ref={(img) => {
        if (img && img.complete && img.naturalWidth > 0) img.dataset.loaded = "1";
      }}
      onLoad={(event) => { event.currentTarget.dataset.loaded = "1"; }}
      src={src}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
    />
  );
}
