"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton, Sheet, useToast } from "./ui";

export type TocItem = { id: string; label: string };

// 报告阅读工具:顶部阅读进度条 + 目录浮层 + 滚动位置保存/恢复 + 收藏 + 分享。
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

export function ReadingProgress({ toc, starId, title }: { toc: TocItem[]; starId: string; title: string }) {
  useReadPosition(starId);
  const toast = useToast();
  const [percent, setPercent] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [faved, setFaved] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setPercent(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    try { setFaved((JSON.parse(localStorage.getItem("mf_favorites_v1") ?? "[]") as string[]).includes(starId)); } catch { /* 忽略 */ }
  }, [starId]);

  const jump = useCallback((id: string) => {
    setTocOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const toggleFav = () => {
    let list: string[] = [];
    try { list = JSON.parse(localStorage.getItem("mf_favorites_v1") ?? "[]") as string[]; } catch { /* 忽略 */ }
    const next = faved ? list.filter((x) => x !== starId) : [...list, starId];
    try { localStorage.setItem("mf_favorites_v1", JSON.stringify(next)); } catch { /* 忽略 */ }
    setFaved(!faved);
    toast(faved ? "已取消收藏" : "已收藏", faved ? "info" : "good");
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `${title} · Myfate`, url });
      else { await navigator.clipboard.writeText(url); toast("链接已复制", "good"); }
    } catch { /* 用户取消 */ }
  };

  return (
    <>
      <div className="mf-read-progress" role="progressbar" aria-label="阅读进度" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <i style={{ width: `${percent}%` }} />
      </div>
      <div className="mf-read-tools">
        <IconButton label="章节目录" onClick={() => setTocOpen(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h13" /></svg>
        </IconButton>
        <IconButton label={faved ? "取消收藏" : "收藏"} onClick={toggleFav}>
          <svg viewBox="0 0 24 24" fill={faved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.6Z" /></svg>
        </IconButton>
        <IconButton label="分享" onClick={() => void share()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 15V4M8.5 7 12 3.5 15.5 7M5.5 12v6.5A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V12" /></svg>
        </IconButton>
      </div>
      <Sheet open={tocOpen} onClose={() => setTocOpen(false)} title="章节目录">
        <nav className="mf-read-toc">
          {toc.map((item, index) => (
            <button type="button" key={item.id} onClick={() => jump(item.id)}>
              <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
            </button>
          ))}
        </nav>
      </Sheet>
    </>
  );
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
