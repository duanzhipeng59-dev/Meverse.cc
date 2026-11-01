"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import LoginModal from "../../components/login-modal";
import { useLanguage } from "../../language-context";

// 我的页:账户卡(邮箱+登录/退出) + 我的额度(解读次数/追问规则展示) + 语言切换 + 订阅升级入口(独立页面)。
// 购买次数的即用入口在确认页额度不足时引导;这里承载后续的订阅/次数包货架。
export default function WorkspaceProfile() {
  const { status, email, markSignedOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
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
    return <div className="mf-bz-profile"><p className="mf-bz-profile-loading">{t("profile.reading")}</p></div>;
  }

  const loggedIn = status === "authenticated";

  return (
    <div className="mf-me">
      <section className="mf-me-account" aria-label={t("profile.account.aria")}>
        <div className="mf-me-account-copy">
          <b>{loggedIn ? email : t("profile.notLoggedIn")}</b>
          {loggedIn ? null : <p>{t("profile.loginToView")}</p>}
        </div>
        {loggedIn ? (
          <button type="button" className="mf-me-logout" onClick={() => { markSignedOut(); router.replace("/"); }}>{t("profile.logout")}</button>
        ) : (
          <LoginModal className="mf-me-login">{t("profile.login")}</LoginModal>
        )}
      </section>

      <section className="mf-me-section" aria-label={t("profile.credits.aria")}>
        <div className="mf-me-panel">
          <h2>{t("profile.credits.title")}</h2>
          {loggedIn ? (
            <div className="mf-me-credits">
              <div className="mf-me-credit-card">
                <span className="mf-me-credit-icon is-report" aria-hidden="true">✦</span>
                <span className="mf-me-credit-copy"><small>{t("profile.credits.report")}</small><b>{credits ?? "…"}</b></span>
              </div>
              <div className="mf-me-credit-card">
                <span className="mf-me-credit-icon is-ask" aria-hidden="true">✧</span>
                <span className="mf-me-credit-copy"><small>{t("profile.credits.ask")}</small><b>{askBank ?? "…"}</b></span>
              </div>
            </div>
          ) : (
            <div className="mf-me-empty"><i aria-hidden="true">◌</i><p>{t("profile.credits.loginHint")}</p></div>
          )}
          <Link className="mf-me-upgrade-bar" href="/home/profile/upgrade?from=profile">
            <span className="mf-me-upgrade-bar-copy"><b>{t("profile.upgrade.title")}</b><small>{t("profile.upgrade.desc")}</small></span>
            <span className="mf-me-upgrade-bar-arrow" aria-hidden="true">›</span>
          </Link>
        </div>
      </section>

      <div className="mf-me-lang-bar">
        <span className="mf-me-upgrade-bar-copy"><b>{t("profile.lang.title")}</b><small>{t("profile.lang.desc")}</small></span>
        <div className="mf-me-lang-seg" role="group" aria-label={t("profile.lang.title")}>
          <button type="button" className={lang === "zh" ? "is-on" : ""} aria-pressed={lang === "zh"} onClick={() => setLang("zh")}>{t("profile.lang.zh")}</button>
          <button type="button" className={lang === "zh-TW" ? "is-on" : ""} aria-pressed={lang === "zh-TW"} onClick={() => setLang("zh-TW")}>{t("profile.lang.zhtw")}</button>
        </div>
      </div>
    </div>
  );
}
