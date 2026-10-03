"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

type ReportKind = "bazi" | "astrology";

const KINDS: Array<{ id: ReportKind; label: string; loading: string; path: string; className: string }> = [
  { id: "bazi", label: "AI 生辰解读", loading: "正在打开画像…", path: "test", className: "mf-primary-button mf-detail-cta" },
  { id: "astrology", label: "AI 星盘解读", loading: "正在打开星盘…", path: "astrology", className: "mf-secondary-button mf-detail-cta mf-detail-astro-cta" },
];

// 报告入口:点击 100ms 内进入加载态(旋转+文案),双按钮互斥禁用,锁定宽度防跳动,超时恢复并提示。
export default function ReportLaunchButtons({ starId }: { starId: string }) {
  const { status } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<ReportKind | null>(null);
  const [error, setError] = useState("");
  const widths = useRef<Partial<Record<ReportKind, number>>>({});
  const timer = useRef<number | undefined>(undefined);

  function launch(kind: ReportKind, href: string) {
    if (pending) return;
    setError("");
    if (status !== "authenticated") {
      window.location.href = `/login?next=${encodeURIComponent(href)}&from=${encodeURIComponent(`/home/relationship-test/${starId}`)}`;
      return;
    }
    setPending(kind);
    // 8 秒未完成跳转则恢复按钮(跳转成功时组件随页面卸载,无需恢复)
    timer.current = window.setTimeout(() => {
      setPending(null);
      setError("打开失败，请重试");
    }, 8000);
    router.push(href);
  }

  function captureWidth(kind: ReportKind, element: HTMLButtonElement | null) {
    if (element && widths.current[kind] === undefined) {
      widths.current[kind] = element.offsetWidth;
    }
  }

  return (
    <>
      {KINDS.map((kind) => {
        const busy = pending === kind.id;
        const disabled = pending !== null;
        return (
          <button
            key={kind.id}
            ref={(element) => captureWidth(kind.id, element)}
            className={kind.className}
            type="button"
            disabled={disabled}
            aria-busy={busy}
            style={busy && widths.current[kind.id] ? { width: widths.current[kind.id] } : undefined}
            onClick={() => launch(kind.id, `/home/relationship-test/${starId}/${kind.path}`)}
          >
            {busy ? <><i className="mf-launch-spinner" aria-hidden="true" />{kind.loading}</> : <>{kind.label} <span aria-hidden="true">→</span></>}
          </button>
        );
      })}
      {error ? <p className="mf-detail-hint" role="alert">{error}</p> : null}
    </>
  );
}
