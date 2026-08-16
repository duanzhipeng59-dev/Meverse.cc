"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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
}: {
  authAction?: () => void;
}) {
  const { t } = useLanguage();
  const label = t("auth.login_register");

  return (
    <header className="site-header">
      <Link className="brand" href="/subscribe" aria-label="WildAI 订阅首页">
        <BrandMark />
        <span>WildAI</span>
      </Link>
      <div className="header-actions">
        <LanguageSwitcher />
        {authAction ? (
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
