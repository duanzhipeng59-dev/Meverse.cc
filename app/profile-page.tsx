"use client";

import Link from "next/link";
import { useAuth } from "./auth-context";
import { useLanguage } from "./language-context";
import { DesktopSidebar, MobileNavigation, SiteHeader } from "./site-chrome";

export default function ProfilePage() {
  const { t } = useLanguage();
  const { status, email } = useAuth();

  const username = email?.split("@")[0] ?? "";
  const avatarLabel = (username.charAt(0) || "W").toUpperCase();

  return (
    <div className="site-shell profile-shell">
      <SiteHeader />
      <div className="page-layout profile-layout">
        <DesktopSidebar active="subscribe" ariaLabel="主导航" />
        <main className="profile-main">
          <div className="profile-heading">
            <span>{t("account.profile_eyebrow")}</span>
            <h1>{t("account.profile")}</h1>
            <p>{t("account.profile_description")}</p>
          </div>

          {status === "loading" ? (
            <section className="profile-card profile-state">
              {t("account.loading")}
            </section>
          ) : email ? (
            <section className="profile-card">
              <div className="profile-avatar" aria-hidden="true">
                {avatarLabel}
              </div>
              <dl>
                <div>
                  <dt>{t("account.username")}</dt>
                  <dd>{username}</dd>
                </div>
                <div>
                  <dt>{t("account.email")}</dt>
                  <dd>{email}</dd>
                </div>
              </dl>
            </section>
          ) : (
            <section className="profile-card profile-state">
              <p>{t("account.login_required")}</p>
              <Link href="/subscribe">{t("auth.login_register")}</Link>
            </section>
          )}
        </main>
      </div>
      <MobileNavigation active="subscribe" />
    </div>
  );
}
