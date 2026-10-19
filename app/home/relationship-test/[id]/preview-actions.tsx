"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, IconButton, useToast } from "../../../components/ui";
import LoginModal from "../../../components/login-modal";
import { readLocalSession } from "../../../local-auth";

// 预览页操作条:查看画像 / 加入合盘 / 收藏(本地,后续批次接同步) / 分享
const FAV_KEY = "mf_favorites_v1";
export function readFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as string[]; } catch { return []; }
}

export default function PreviewActions({ starId, nameEn }: { starId: string; nameEn: string }) {
  const router = useRouter();
  const toast = useToast();
  const [faved, setFaved] = useState(false);
  // 登录门:未登录点主操作弹登录弹窗(与工作台其它入口统一),登录成功后续跳原目标;
  // 服务端 requirePageUser 仍是最终权限依据
  const [authed, setAuthed] = useState(true);
  const [pending, setPending] = useState<"report" | "dual" | null>(null);

  useEffect(() => {
    const sync = () => setAuthed(Boolean(readLocalSession()));
    sync();
    window.addEventListener("myfate-auth-change", sync);
    return () => window.removeEventListener("myfate-auth-change", sync);
  }, []);

  useEffect(() => { setFaved(readFavorites().includes(starId)); }, [starId]);

  function openTarget(kind: "report" | "dual") {
    if (authed) router.push(kind === "report" ? `/home/relationship-test/${starId}/test` : `/home/dual-star-match?star=${starId}`);
    else setPending(kind);
  }

  const toggleFav = () => {
    const list = readFavorites();
    const next = faved ? list.filter((id) => id !== starId) : [...list, starId];
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* 忽略 */ }
    setFaved(!faved);
    toast(faved ? "已取消收藏" : "已收藏", faved ? "info" : "good");
  };


  const share = async () => {
    const url = typeof window === "undefined" ? "" : window.location.href;
    const title = `${nameEn || "TA"} 的生辰画像 · Myfate`;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); toast("链接已复制", "good"); }
    } catch { /* 用户取消 */ }
  };

  return (
    <div className="mf-preview-actions">
      <Button variant="primary" onClick={() => openTarget("report")}>查看完整画像</Button>
      <Button variant="ghost" onClick={() => openTarget("dual")}>测自己 →</Button>
      <LoginModal
        open={pending !== null}
        onOpenChange={(open) => { if (!open) setPending(null); }}
        onAuthenticated={() => {
          const target = pending;
          setPending(null);
          if (target === "report") router.push(`/home/relationship-test/${starId}/test`);
          if (target === "dual") router.push(`/home/dual-star-match?star=${starId}`);
        }}
      />
      <div className="mf-preview-actions-row">
        <IconButton label={faved ? "取消收藏" : "收藏"} onClick={toggleFav} className={faved ? "is-faved" : undefined}>
          <svg viewBox="0 0 24 24" fill={faved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.6Z" /></svg>
        </IconButton>
        <IconButton label="分享" onClick={() => void share()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 15V4M8.5 7 12 3.5 15.5 7M5.5 12v6.5A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V12" /></svg>
        </IconButton>
      </div>
    </div>
  );
}
