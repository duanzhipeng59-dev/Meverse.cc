"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "./language-context";
import LanguageSwitcher from "./language-switcher";

export type MainSection = "subscribe" | "orders" | "invitations";

const NAV_ITEMS: Array<{
  id: MainSection;
  href: string;
  labelKey: string;
  icon: string;
}> = [
  { id: "subscribe", href: "/subscribe", labelKey: "nav.subscribe", icon: "▦" },
  { id: "orders", href: "/orders", labelKey: "nav.orders", icon: "↻" },
  {
    id: "invitations",
    href: "/invitations",
    labelKey: "nav.invitations",
    icon: "♙",
  },
];

const DESKTOP_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.id !== "invitations",
);

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function SiteHeader({
  authAction,
  authEmail,
  onSignedOut,
}: {
  authAction?: () => void;
  authEmail?: string | null;
  onSignedOut?: () => void;
}) {
  const { t } = useLanguage();
  const label = t("auth.login_register");
  const [sessionEmail, setSessionEmail] = useState<string | null>(
    authEmail ?? null,
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayedEmail = authEmail === undefined ? sessionEmail : authEmail;

  useEffect(() => {
    if (authEmail !== undefined) return;
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(
        (response) =>
          response.json() as Promise<{
            user?: { email?: string } | null;
          }>,
      )
      .then((result) => {
        if (active) setSessionEmail(result.user?.email ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [authEmail]);

  useEffect(() => {
    if (!menuOpen) return;
    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setSessionEmail(null);
      setMenuOpen(false);
      setSigningOut(false);
      onSignedOut?.();
      window.location.assign("/subscribe");
    }
  }

  return (
    <header className="site-header">
      <Link className="brand" href="/subscribe" aria-label="WildGPT 订阅首页">
        <BrandMark />
        <span>WildGPT</span>
      </Link>
      <div className="header-actions">
        <LanguageSwitcher />
        {displayedEmail ? (
          <div className="account-menu" ref={menuRef}>
            <button
              className="account-avatar"
              type="button"
              aria-label={t("account.open_menu")}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5.8 19c.7-3.2 3-5 6.2-5s5.5 1.8 6.2 5" />
              </svg>
            </button>
            {menuOpen ? (
              <div className="account-dropdown" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  disabled={signingOut}
                  onClick={() => void signOut()}
                >
                  <span aria-hidden="true">↗</span>
                  {signingOut ? t("account.signing_out") : t("account.sign_out")}
                </button>
              </div>
            ) : null}
          </div>
        ) : authAction ? (
          <button
            className="auth-entry-button"
            type="button"
            onClick={authAction}
          >
            {label}
          </button>
        ) : (
          <Link className="auth-entry-button auth-entry-link" href="/subscribe">
            {label}
          </Link>
        )}
      </div>
    </header>
  );
}

export function DesktopSidebar({
  active,
  ariaLabel,
  className = "sidebar",
}: {
  active: MainSection;
  ariaLabel: string;
  className?: string;
}) {
  const { t } = useLanguage();

  return (
    <aside className={className} aria-label={ariaLabel}>
      <nav>
        {DESKTOP_NAV_ITEMS.map((item) => (
          <Link
            className={item.id === active ? "nav-item active" : "nav-item"}
            href={item.href}
            aria-current={item.id === active ? "page" : undefined}
            key={item.id}
          >
            {t(item.labelKey)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function MobileNavigation({
  active,
  className = "mobile-nav",
}: {
  active: MainSection;
  className?: string;
}) {
  const { t } = useLanguage();

  return (
    <nav className={className} aria-label="移动端主导航">
      {NAV_ITEMS.map((item) => (
        <Link
          className={item.id === active ? "active" : undefined}
          href={item.href}
          aria-current={item.id === active ? "page" : undefined}
          key={item.id}
        >
          <span aria-hidden="true">{item.icon}</span>
          {t(item.labelKey)}
        </Link>
      ))}
    </nav>
  );
}

export function Toast({ children }: { children: ReactNode }) {
  if (!children) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      {children}
    </div>
  );
}
