"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth-context";

const menuItems = [
  {
    icon: "heart",
    label: "明星合盘",
    description: "查看你与 TA 的三柱关系结构",
    href: "/home/relationship-test",
  },
  {
    icon: "report",
    label: "我的报告",
    description: "查看每一次合盘记录",
    href: "/home/reports",
  },
];

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 9.1c0 4.7-8.5 9.4-8.5 9.4S3.5 13.8 3.5 9.1A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.5 2.4Z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19c.8-3.2 3-4.8 6.5-4.8s5.7 1.6 6.5 4.8" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.75h7l3 3V20.25H7z" />
      <path d="M14 3.75v3h3M10 11h4M10 14.5h4" />
    </svg>
  );
}

function UpgradeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 8.25h15v10.5h-15z" />
      <path d="M4.5 11.25h15M8 8.25c-1.9 0-3-1-3-2.15 0-1.05.75-1.85 1.85-1.85C8.55 4.25 10 6.1 12 8.25M16 8.25c1.9 0 3-1 3-2.15 0-1.05-.75-1.85-1.85-1.85C15.45 4.25 14 6.1 12 8.25M12 8.25v10.5" />
    </svg>
  );
}

function MenuIcon({ icon }: { icon: string }) {
  if (icon === "report") return <ReportIcon />;
  return <HeartIcon />;
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10M14.5 8l4 4-4 4M9 12h9" />
    </svg>
  );
}

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, markSignedOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const isDetail = pathname.split("/").filter(Boolean).length > 2;
  const loginHref = `/login?next=${encodeURIComponent(pathname)}&from=${encodeURIComponent(pathname)}`;

  useEffect(() => () => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
  }, []);

  function openMobileMenu() {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    setMobileMenuClosing(false);
    if (!mobileMenuRef.current?.open) {
      mobileMenuRef.current?.showModal();
      setMobileMenuOpen(true);
    }
  }

  function closeMobileMenu() {
    const dialog = mobileMenuRef.current;
    if (!dialog?.open || mobileMenuClosing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.close();
      setMobileMenuOpen(false);
      return;
    }
    setMobileMenuClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      dialog.close();
      setMobileMenuOpen(false);
      setMobileMenuClosing(false);
      closeTimerRef.current = null;
    }, 240);
  }

  return (
    <div className={isDetail ? "mf-workspace-shell is-detail" : "mf-workspace-shell"}>
      <header className="mf-workspace-mobile-bar">
        <Link className="mf-workspace-brand" href="/" aria-label="返回 Myfate 首页">
          <span className="mf-brand-mark">M</span>
          <span>Myfate</span>
        </Link>
        <button
          className="mf-mobile-menu-trigger"
          type="button"
          aria-label="打开工作台菜单"
          aria-haspopup="dialog"
          aria-expanded={mobileMenuOpen}
          onClick={openMobileMenu}
        >
          <span /><span /><span />
        </button>
      </header>

      <aside className="mf-workspace-sidebar">
        <Link className="mf-workspace-brand" href="/" aria-label="返回 Myfate 首页">
          <span className="mf-brand-mark">M</span>
          <span>Myfate</span>
        </Link>

        <div className="mf-workspace-label">探索</div>
        <nav className="mf-workspace-nav" aria-label="工作台主菜单">
          {menuItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                className={active ? "mf-workspace-nav-item active" : "mf-workspace-nav-item"}
                href={item.href}
                aria-current={active ? "page" : undefined}
                key={item.href}
              >
                <span className="mf-workspace-nav-icon"><MenuIcon icon={item.icon} /></span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mf-workspace-account" aria-label="账户选项">
          <Link
            className={pathname === "/home/upgrade" ? "active" : undefined}
            href="/home/upgrade"
            aria-current={pathname === "/home/upgrade" ? "page" : undefined}
          >
            <span className="mf-workspace-nav-icon"><UpgradeIcon /></span>
            <span>订阅升级</span>
          </Link>
          <Link
            className={pathname === "/home/profile" ? "active" : undefined}
            href="/home/profile"
            aria-current={pathname === "/home/profile" ? "page" : undefined}
          >
            <span className="mf-workspace-nav-icon"><UserIcon /></span>
            <span>个人中心</span>
          </Link>
          {status === "authenticated" ? (
            <button
              type="button"
              onClick={() => {
                markSignedOut();
                router.replace("/");
              }}
            >
              <span className="mf-workspace-nav-icon"><LogoutIcon /></span>
              <span>退出登录</span>
            </button>
          ) : (
            <Link href={loginHref}>
              <span className="mf-workspace-nav-icon"><LogoutIcon /></span>
              <span>登录</span>
            </Link>
          )}
        </div>
      </aside>

      <dialog
        className={mobileMenuClosing ? "mf-mobile-menu-dialog is-closing" : "mf-mobile-menu-dialog"}
        ref={mobileMenuRef}
        aria-label="工作台菜单"
        onClose={() => {
          setMobileMenuOpen(false);
          setMobileMenuClosing(false);
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeMobileMenu();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMobileMenu();
        }}
      >
        <div className="mf-mobile-menu-panel">
          <div className="mf-mobile-menu-heading">
            <Link className="mf-workspace-brand" href="/" aria-label="返回 Myfate 首页" onClick={() => mobileMenuRef.current?.close()}>
              <span className="mf-brand-mark">M</span>
              <span>Myfate</span>
            </Link>
            <button type="button" aria-label="关闭工作台菜单" autoFocus onClick={closeMobileMenu}>×</button>
          </div>

          <div className="mf-workspace-label">探索</div>
          <nav className="mf-workspace-nav" aria-label="手机端工作台主菜单">
            {menuItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  className={active ? "mf-workspace-nav-item active" : "mf-workspace-nav-item"}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => mobileMenuRef.current?.close()}
                  key={item.href}
                >
                  <span className="mf-workspace-nav-icon"><MenuIcon icon={item.icon} /></span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                </Link>
              );
            })}
          </nav>

          <div className="mf-mobile-menu-account">
            <Link
              className={pathname === "/home/upgrade" ? "active" : undefined}
              href="/home/upgrade"
              aria-current={pathname === "/home/upgrade" ? "page" : undefined}
              onClick={() => mobileMenuRef.current?.close()}
            >
              <span className="mf-workspace-nav-icon"><UpgradeIcon /></span>
              <span>订阅升级</span>
            </Link>
            <Link
              className={pathname === "/home/profile" ? "active" : undefined}
              href="/home/profile"
              aria-current={pathname === "/home/profile" ? "page" : undefined}
              onClick={() => mobileMenuRef.current?.close()}
            >
              <span className="mf-workspace-nav-icon"><UserIcon /></span>
              <span>个人中心</span>
            </Link>
            {status === "authenticated" ? (
              <button
                type="button"
                onClick={() => {
                  mobileMenuRef.current?.close();
                  markSignedOut();
                  router.replace("/");
                }}
              >
                <span className="mf-workspace-nav-icon"><LogoutIcon /></span>
                <span>退出登录</span>
              </button>
            ) : (
              <Link href={loginHref} onClick={() => mobileMenuRef.current?.close()}>
                <span className="mf-workspace-nav-icon"><LogoutIcon /></span>
                <span>登录</span>
              </Link>
            )}
          </div>
        </div>
      </dialog>

      <main className="mf-workspace-main">
        {children}
      </main>
    </div>
  );
}
