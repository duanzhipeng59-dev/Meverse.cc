"use client";

import { useState } from "react";
import LoginModal from "../../../../../components/login-modal";
import { readLocalSession } from "../../../../../local-auth";
import { removePending } from "../../../dual-pending";

// 确认页动作:登录门与工作台其它入口统一,未登录弹登录弹窗,登录后自动继续;
// 创建成功跳报告页(生成中),该组合已有报告时接口返回已有报告,同样直达。
export default function DualConfirmActions({ starA, starB }: { starA: string; starB: string }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  async function start() {
    if (creating) return;
    if (!readLocalSession()) {
      setLoginOpen(true);
      return;
    }
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/dual-star/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ starA, starB }),
      });
      const data = await response.json() as { reportId?: string; error?: string };
      if (!response.ok || !data.reportId) {
        setError(data.error === "INCOMPLETE_BIRTH_DATA" ? "两位偶像的出生资料都需要完整（日期、时间、地点）才能生成合盘。" : "生成请求失败，请重试。");
        setCreating(false);
        return;
      }
      // 报告开始生成,「待生成」横条的历史使命完成
      removePending(starA, starB);
      window.location.href = `/home/dual-star-match/reports/${data.reportId}`;    } catch {
      setError("网络异常，请重试。");
      setCreating(false);
    }
  }

  return (
    <div className="mf-dual-confirm-cta">
      <button className="mf-primary-button mf-dual-generate" type="button" disabled={creating} onClick={() => void start()}>
        {creating ? "正在创建…" : "开始分析"}
      </button>
      {error ? <p className="mf-dual-error" role="alert">{error}</p> : null}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onAuthenticated={() => { setLoginOpen(false); void start(); }} />
    </div>
  );
}
