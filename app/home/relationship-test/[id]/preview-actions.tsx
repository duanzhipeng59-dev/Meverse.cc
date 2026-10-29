"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, useToast } from "../../../components/ui";
import LoginModal from "../../../components/login-modal";
import { readLocalSession } from "../../../local-auth";

// 预览页操作条:查看画像 / 收藏(本地记录,不跳转);分享在页面顶栏
const FAV_KEY = "mf_favorites_v1";
export function readFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as string[]; } catch { return []; }
}

export default function PreviewActions({ starId }: { starId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [faved, setFaved] = useState(false);
  // 登录门:未登录点主操作弹登录弹窗(与工作台其它入口统一),登录成功后续跳原目标;
  // 服务端 requirePageUser 仍是最终权限依据
  const [authed, setAuthed] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const sync = () => setAuthed(Boolean(readLocalSession()));
    sync();
    window.addEventListener("myfate-auth-change", sync);
    return () => window.removeEventListener("myfate-auth-change", sync);
  }, []);

  useEffect(() => { setFaved(readFavorites().includes(starId)); }, [starId]);

  function openReport() {
    if (authed) router.push(`/home/relationship-test/${starId}/test`);
    else setPending(true);
  }

  const toggleFav = () => {
    const list = readFavorites();
    const next = faved ? list.filter((id) => id !== starId) : [...list, starId];
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* 忽略 */ }
    setFaved(!faved);
    toast(faved ? "已取消收藏" : "已收藏", faved ? "info" : "good");
  };

  return (
    <div className="mf-preview-actions">
      <Button variant="primary" onClick={openReport}>查看完整画像</Button>
      <Button variant="ghost" className={faved ? "is-faved" : ""} onClick={toggleFav}>
        <svg viewBox="0 0 24 24" fill={faved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.6Z" /></svg>
        {faved ? "已收藏" : "收藏"}
      </Button>
      <LoginModal
        open={pending}
        onOpenChange={(open) => { if (!open) setPending(false); }}
        onAuthenticated={() => {
          setPending(false);
          router.push(`/home/relationship-test/${starId}/test`);
        }}
      />
    </div>
  );
}
