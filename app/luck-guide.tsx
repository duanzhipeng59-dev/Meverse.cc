"use client";

import { useEffect, useRef, useState } from "react";

// 大运/流年/顺势指数的说明弹层:底部抽屉,关闭后停留在原阅读位置。
export default function LuckGuide() {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button className="mf-luck-guide-trigger" type="button" onClick={() => setOpen(true)}>
        <i aria-hidden="true">?</i>如何理解
      </button>
      {open ? (
        <div className="mf-luck-guide" role="dialog" aria-modal="true" aria-label="如何理解大运与流年" ref={sheetRef}>
          <div className="mf-luck-guide-mask" onClick={() => setOpen(false)} />
          <div className="mf-luck-guide-sheet">
            <header>
              <b>如何理解大运与流年</b>
              <button type="button" aria-label="关闭说明" onClick={() => setOpen(false)}>×</button>
            </header>
            <dl>
              <dt>什么是大运</dt>
              <dd>大运代表约十年的长期人生背景，反映这一阶段持续存在的主题和主要力量。</dd>
              <dt>什么是流年</dt>
              <dd>流年代表某一个具体年份的变化。流年发生在当前大运背景之中，同一年需要结合所属大运一起理解。</dd>
              <dt>什么是顺势指数</dt>
              <dd>顺势指数用于比较不同年份的整体节奏，表示该年命理结构与个人原局、当前大运之间的整体协调程度。分数越高，代表该年的外部节奏与个人状态更容易配合；分数较低，代表需要更主动地调整计划。<b>它不是好运或坏运的绝对判断，也不是人生结果预测。</b></dd>
              <dt>颜色代表什么</dt>
              <dd><span className="is-good">顺势（70–100）</span>推进阻力相对较小，适合把握重点机会；<span className="is-neutral">平稳（50–69）</span>有机会也有约束，适合保持节奏；<span className="is-caution">调整（0–49）</span>变化或消耗较多，适合控制风险、重新整理。</dd>
              <dt>报告边界</dt>
              <dd>本报告基于传统命理体系做文化解读，不代表确定事件，不作绝对吉凶判断。</dd>
            </dl>
          </div>
        </div>
      ) : null}
    </>
  );
}
