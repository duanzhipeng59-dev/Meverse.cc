"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import { useLanguage } from "./language-context";
import LanguageSwitcher from "./language-switcher";

export type MainSection = "subscribe" | "orders" | "invitations";

const NAV_ITEMS: Array<{
  id: MainSection;
  href: string;
  labelKey: string;
}> = [
  { id: "subscribe", href: "/subscribe", labelKey: "nav.subscribe" },
  { id: "orders", href: "/orders", labelKey: "nav.orders" },
  {
    id: "invitations",
    href: "/invitations",
    labelKey: "nav.invitations",
  },
];

const PRIMARY_NAV_ITEMS = NAV_ITEMS.filter(
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

function NavigationIcon({ id }: { id: MainSection }) {
  if (id === "orders") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4.75h10A2.25 2.25 0 0 1 19.25 7v12l-3-1.75L12 19.5l-4.25-2.25L4.75 19V7A2.25 2.25 0 0 1 7 4.75Z" />
        <path d="M8.5 9h7M8.5 12.5h5" />
      </svg>
    );
  }

  if (id === "invitations") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 13.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" />
        <path d="M5.5 20c.75-3.25 3-5 6.5-5s5.75 1.75 6.5 5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.25" y="4.25" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.25" y="4.25" width="6.5" height="6.5" rx="1.5" />
      <rect x="4.25" y="13.25" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.25" y="13.25" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

export function SiteHeader({ onLogin }: { onLogin?: () => void }) {
  const { t } = useLanguage();
  const { status, email, markSignedOut } = useAuth();
  const label = t("auth.login_register");
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      markSignedOut();
      setMenuOpen(false);
      setSigningOut(false);
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
        {status === "loading" ? (
          <div className="account-avatar-placeholder" aria-hidden="true" />
        ) : email ? (
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
        ) : onLogin ? (
          <button
            className="auth-entry-button"
            type="button"
            onClick={onLogin}
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

// vinext only exposes the committed pathname through usePathname, so the
// highlight would otherwise wait for navigation to finish. pendingHref is
// set synchronously in the Link onNavigate (before navigation starts) and
// cleared once the committed pathname catches up — the active menu item
// switches in the same frame as the click.
function useNavActive(fallback: MainSection) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear the optimistic highlight once the committed pathname catches up.
  // Render-time adjustment (React's "derive state from props" pattern)
  // avoids an effect that would re-render after every navigation commit.
  if (pendingHref !== null && pendingHref === pathname) {
    setPendingHref(null);
  }

  const activeId =
    NAV_ITEMS.find((item) => item.href === (pendingHref ?? pathname))?.id ??
    fallback;

  return { activeId, setPendingHref };
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
  const { activeId, setPendingHref } = useNavActive(active);

  return (
    <aside className={className} aria-label={ariaLabel}>
      <nav>
        {PRIMARY_NAV_ITEMS.map((item) => (
          <Link
            className={item.id === activeId ? "nav-item active" : "nav-item"}
            href={item.href}
            aria-current={item.id === activeId ? "page" : undefined}
            key={item.id}
            onNavigate={() => setPendingHref(item.href)}
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
  const { activeId, setPendingHref } = useNavActive(active);

  return (
    <nav className={className} aria-label="移动端主导航">
      {PRIMARY_NAV_ITEMS.map((item) => (
        <Link
          className={item.id === activeId ? "active" : undefined}
          href={item.href}
          aria-current={item.id === activeId ? "page" : undefined}
          key={item.id}
          onNavigate={() => setPendingHref(item.href)}
        >
          <span className="mobile-nav-icon">
            <NavigationIcon id={item.id} />
          </span>
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
