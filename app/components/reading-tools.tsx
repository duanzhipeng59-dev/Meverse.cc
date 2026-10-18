"use client";

import { useEffect, useRef } from "react";

export type TocItem = { id: string; label: string };

// 报告阅读工具:滚动位置保存/恢复(目录/收藏/分享入口已随 UI 精简移除,分享在各页顶栏)。
// 位置按 starId 存 localStorage(登录同步属持久化批次)。
export function useReadPosition(key: string) {
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = Number(localStorage.getItem(`mf_readpos_${key}`) ?? "0");
    if (saved > 120) requestAnimationFrame(() => window.scrollTo({ top: saved, behavior: "auto" }));
  }, [key]);
  useEffect(() => {
    const save = () => { try { localStorage.setItem(`mf_readpos_${key}`, String(Math.round(window.scrollY))); } catch { /* 忽略 */ } };
    window.addEventListener("pagehide", save);
    return () => { window.removeEventListener("pagehide", save); save(); };
  }, [key]);
}

export function ReadingProgress({ starId }: { starId: string }) {
  useReadPosition(starId);
  return null;
}

// 章节底部「就这段问 AI」:滚动到追问区并聚焦输入(问题预填随 AI 对话批次接入)
export function AskAboutSection({ sectionLabel }: { sectionLabel: string }) {
  return (
    <button
      type="button"
      className="mf-ask-section"
      onClick={() => {
        document.getElementById("ask")?.scrollIntoView({ behavior: "smooth", block: "start" });
        // 预填章节上下文(ask-panel 监听该事件),再聚焦输入
        window.dispatchEvent(new CustomEvent("mf-ask-section", { detail: sectionLabel }));
      }}
    >
      就「{sectionLabel}」问 AI →
    </button>
  );
}
