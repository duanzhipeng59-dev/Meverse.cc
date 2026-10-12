"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, IconButton, useToast } from "../../../components/ui";

// 预览页操作条:查看画像 / 加入合盘 / 收藏(本地,后续批次接同步) / 分享
const FAV_KEY = "mf_favorites_v1";
export function readFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]") as string[]; } catch { return []; }
}

export default function PreviewActions({ starId, nameEn }: { starId: string; nameEn: string }) {
  const router = useRouter();
  const toast = useToast();
  const [faved, setFaved] = useState(false);

  useEffect(() => { setFaved(readFavorites().includes(starId)); }, [starId]);

  const toggleFav = () => {
    const list = readFavorites();
    const next = faved ? list.filter((id) => id !== starId) : [...list, starId];
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch { /* 忽略 */ }
    setFaved(!faved);
    toast(faved ? "已取消收藏" : "已收藏", faved ? "info" : "good");
  };


  return (
    <div className="mf-preview-actions">
      <Button variant="primary" onClick={() => router.push(`/home/relationship-test/${starId}/test`)}>查看完整画像</Button>
      <Button variant="ghost" onClick={() => router.push(`/home/dual-star-match?star=${starId}`)}>加入双人合盘</Button>
      <div className="mf-preview-actions-row">
        <IconButton label={faved ? "取消收藏" : "收藏"} onClick={toggleFav}>
          <svg viewBox="0 0 24 24" fill={faved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.6Z" /></svg>
        </IconButton>
      </div>
    </div>
  );
}
