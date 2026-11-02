"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoginModal from "../../../components/login-modal";
import RouteSkeleton from "../../../route-skeleton";
import { readLocalSession } from "../../../local-auth";
import { useLanguage } from "../../../language-context";

// 预选合盘的跨页交接 key:解读页挂载时一次性消费并 removeItem(同 relationship-profile 模式)
export const PENDING_DUAL_KEY = "myfate-pending-dual";

// 预览页「加入合盘」入口:人物卡右下角的超链,点击跳解读页并自动弹双人弹窗、对方预选本明星。
// hidden=true 时整体隐藏(运营下线开关),登录门与跳转逻辑保留随时可再启用
export default function PreviewActions({ starId, starKey, hidden = false }: { starId: string; starKey: string; hidden?: boolean }) {
  const router = useRouter();
  const { t } = useLanguage();
  // 登录门:未登录点链接弹登录弹窗(与工作台其它入口统一),登录成功后续跳原目标
  const [authed, setAuthed] = useState(true);
  const [pending, setPending] = useState(false);
  // 跳转瞬间以整屏报告骨架接管,不等新页 RSC 加载完成才切换
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    const sync = () => setAuthed(Boolean(readLocalSession()));
    sync();
    window.addEventListener("myfate-auth-change", sync);
    return () => window.removeEventListener("myfate-auth-change", sync);
  }, []);

  // 写入预选明星后跳解读页;解读页消费该 key 自动开双人弹窗并选中对方
  function joinDual() {
    try { sessionStorage.setItem(PENDING_DUAL_KEY, starKey); } catch { /* 隐私模式忽略,弹窗仍会打开 */ }
    setEntering(true);
    router.push("/home/dual-star-match");
  }

  // 普通点击走预选流程;新标签/新窗口(Cmd/Ctrl/Shift+点击)保留原生导航
  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    if (authed) joinDual();
    else setPending(true);
  }

  // 运营下线:整体不渲染(登录门/跳转逻辑保留在组件内,hidden 改回 false 即恢复)
  if (hidden) return null;

  return (
    <div className="mf-preview-actions is-hero-link">
      <RouteSkeleton active={entering} variant="star-report" />
      <a className="mf-preview-join-link" href="/home/dual-star-match" onClick={onClick}>
        {t("preview.joinDual")} <span aria-hidden="true">→</span>
      </a>
      <LoginModal
        open={pending}
        onOpenChange={(open) => { if (!open) setPending(false); }}
        onAuthenticated={() => {
          setPending(false);
          joinDual();
        }}
      />
    </div>
  );
}
