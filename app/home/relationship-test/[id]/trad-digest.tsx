"use client";

// 预览页报告摘要:三条摘要按语言做简/繁转换(opencc 数据级);带 section 的摘要块可点击,
// 弹窗只显示被点击那一章的完整内容(标题+摘要+全部 insight);无报告时的人物简介不可点。
import { useEffect, useState } from "react";
import { useTradData } from "../../../trad-convert";
import { ReadableText } from "../../reading/[id]/static-reading-report";

type SectionContent = { title: string; summary?: string; insights: Array<{ label: string; content: string }> };
type DigestItem = { key: string; title: string; text: string; section?: SectionContent };

export default function TradDigest({ items }: { items: DigestItem[] }) {
  const digest = useTradData(items);
  const [active, setActive] = useState<number | null>(null);
  const current = active !== null ? digest[active] : null;

  // 弹窗打开期间:Esc 关闭 + 锁定背景滚动(依赖布尔值,切换章节不重建监听)
  const modalOpen = active !== null && Boolean(current?.section);
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setActive(null); };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [modalOpen]);

  return (
    <>
      {digest.map((item, index) => {
        const clickable = Boolean(item.section);
        return (
          <blockquote
            className={clickable ? "is-clickable" : undefined}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            key={item.key}
            onClick={clickable ? () => setActive(index) : undefined}
            onKeyDown={clickable ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActive(index); } } : undefined}
          >
            <b>{item.title}</b>
            <p>{item.text}…</p>
          </blockquote>
        );
      })}

      {modalOpen && current?.section ? (
        <div className="mf-login-modal-overlay" role="dialog" aria-modal="true" aria-label={current.section.title}>
          <div className="mf-login-modal-mask" aria-hidden="true" onClick={() => setActive(null)} />
          {/* 无标题/关闭钮/外层卡片:遮罩 + 内容块本体;Esc 与点遮罩关闭 */}
          <section className="mf-preview-digest-modal">
            {current.section.summary ? <p className="mf-sr-lead"><ReadableText text={current.section.summary} /></p> : null}
            <div className="mf-sr-insights">
              {current.section.insights.map((insight, index) => (
                <article className="mf-sr-insight" key={`${insight.label}-${index}`}>
                  {insight.label ? <em>{insight.label}</em> : null}
                  <p><ReadableText text={insight.content} /></p>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
