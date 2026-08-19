"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "./language-context";
import { DesktopSidebar, MobileNavigation, SiteHeader } from "./site-chrome";

export default function ProfilePage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(
        (response) =>
          response.json() as Promise<{
            user?: { email?: string } | null;
          }>,
      )
      .then((result) => {
        if (!active) return;
        setEmail(result.user?.email ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const username = email?.split("@")[0] ?? "";
  const avatarLabel = (username.charAt(0) || "W").toUpperCase();

  return (
    <div className="site-shell profile-shell">
      <SiteHeader authEmail={email} />
      <div className="page-layout profile-layout">
        <DesktopSidebar active="subscribe" ariaLabel="主导航" />
        <main className="profile-main">
          <div className="profile-heading">
            <span>{t("account.profile_eyebrow")}</span>
            <h1>{t("account.profile")}</h1>
            <p>{t("account.profile_description")}</p>
          </div>

          {loading ? (
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
