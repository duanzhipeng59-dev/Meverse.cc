"use client";

// 预览页报告摘要的繁中包装:三条摘要(章节标题+正文截断)是服务端存储的简体文本,
// 繁中模式下经 opencc 数据级转换后渲染;简体直通。
import { useTradData } from "../../../trad-convert";

export default function TradDigest({ items }: { items: Array<{ title: string; text: string }> }) {
  const digest = useTradData(items);
  return (
    <>
      {digest.map((item) => (
        <blockquote key={item.title}>
          <b>{item.title}</b>
          <p>{item.text}…</p>
        </blockquote>
      ))}
    </>
  );
}
