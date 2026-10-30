"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui";
import LoginModal from "../../../components/login-modal";
import RouteSkeleton from "../../../route-skeleton";
import { readLocalSession } from "../../../local-auth";

// 预览页操作条:查看画像;分享在页面顶栏
export default function PreviewActions({ starId }: { starId: string }) {
  const router = useRouter();
  // 登录门:未登录点主操作弹登录弹窗(与工作台其它入口统一),登录成功后续跳原目标;
  // 服务端 requirePageUser 仍是最终权限依据
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

  function openReport() {
    if (authed) {
      setEntering(true);
      router.push(`/home/relationship-test/${starId}/test`);
    } else setPending(true);
  }

  return (
    <div className="mf-preview-actions">
      <RouteSkeleton active={entering} />
      <Button variant="primary" onClick={openReport}>查看完整画像</Button>
      <LoginModal
        open={pending}
        onOpenChange={(open) => { if (!open) setPending(false); }}
        onAuthenticated={() => {
          setPending(false);
          setEntering(true);
          router.push(`/home/relationship-test/${starId}/test`);
        }}
      />
    </div>
  );
}
