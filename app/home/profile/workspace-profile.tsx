"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import LoginModal from "../../components/login-modal";

// 我的页:账户卡(邮箱+登录/退出) + 我的额度(解读次数/追问规则展示) + 订阅升级入口(独立页面)。
// 购买次数的即用入口在确认页额度不足时引导;这里承载后续的订阅/次数包货架。
export default function WorkspaceProfile() {
  const { status, email, markSignedOut } = useAuth();
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [askBank, setAskBank] = useState<number | null>(null);

  useEffect(() => {
    // 未登录不展示额度区块,无需清状态;登录态变化时重新拉取
    if (status === "authenticated") {
      fetch("/api/myfate/credits")
        .then((res) => (res.ok ? res.json() as Promise<{ balance?: number; askBank?: number }> : null))
        .then((data) => {
          setCredits(typeof data?.balance === "number" ? data.balance : null);
          setAskBank(typeof data?.askBank === "number" ? data.askBank : null);
        })
        .catch(() => { setCredits(null); setAskBank(null); });
    }
  }, [status]);

  if (status === "loading") {
    return <div className="mf-bz-profile"><p className="mf-bz-profile-loading">正在读取…</p></div>;
  }

  const loggedIn = status === "authenticated";

  return (
    <div className="mf-me">
      <section className="mf-me-account" aria-label="账户">
        <div className="mf-me-account-copy">
          <b>{loggedIn ? email : "尚未登录"}</b>
          {loggedIn ? null : <p>登录后可查看完整报告</p>}
        </div>
        {loggedIn ? (
          <button type="button" className="mf-me-logout" onClick={() => { markSignedOut(); router.replace("/"); }}>退出登录</button>
        ) : (
          <LoginModal className="mf-me-login">登录</LoginModal>
        )}
      </section>

      <section className="mf-me-section" aria-label="我的额度">
        <div className="mf-me-section-head">
          <h2>我的额度</h2>
        </div>
        <div className="mf-me-panel">
          {loggedIn ? (
            <div className="mf-me-credits">
              <div className="mf-me-credit-card">
                <span className="mf-me-credit-icon is-report" aria-hidden="true">✦</span>
                <span className="mf-me-credit-copy"><small>报告次数</small><b>{credits ?? "…"}</b></span>
              </div>
              <div className="mf-me-credit-card">
                <span className="mf-me-credit-icon is-ask" aria-hidden="true">✧</span>
                <span className="mf-me-credit-copy"><small>追问次数</small><b>{askBank ?? "…"}</b></span>
              </div>
            </div>
          ) : (
            <div className="mf-me-empty"><i aria-hidden="true">◌</i><p>登录后可查看与购买解读次数</p></div>
          )}
          <Link className="mf-me-upgrade-bar" href="/home/profile/upgrade">
            <span className="mf-me-upgrade-bar-copy"><b>订阅升级</b><small>解锁更多额度与专属权益</small></span>
            <span className="mf-me-upgrade-bar-arrow" aria-hidden="true">›</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
