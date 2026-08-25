"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth-context";
import { readBasicProfile } from "../myfate-progressive-profile";

const menuItems = [
  {
    icon: "heart",
    label: "明星正缘测试",
    description: "找到你和 TA 的相处密码",
    href: "/home/celebrity-match",
  },
  {
    icon: "profile",
    label: "关系行为画像",
    description: "看见你的自然相处方式",
    href: "/home/relationship-profile",
  },
  {
    icon: "report",
    label: "我的报告",
    description: "查看每一次测试记录",
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

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" />
      <path d="M8.5 13.5c1.1 1 2.3 1.5 3.5 1.5s2.4-.5 3.5-1.5M9.5 9.5h.01M14.5 9.5h.01" />
    </svg>
  );
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
  const { status, email, markSignedOut } = useAuth();
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenuClosing, setMobileMenuClosing] = useState(false);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const isDetail = pathname.split("/").filter(Boolean).length > 2;

  useEffect(() => {
    if (status === "loading") return;
    const load = () => {
      const profile = readBasicProfile(email);
      setMissingProfileFields([
        !profile.birthDate ? "出生日期" : "",
        !/^[IE][NS][TF][JP]$/.test(profile.mbti) ? "MBTI" : "",
      ].filter(Boolean));
    };
    load();
    window.addEventListener("myfate-profile-updated", load);
    return () => window.removeEventListener("myfate-profile-updated", load);
  }, [status, email]);

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
                <span className="mf-workspace-nav-icon">{item.icon === "report" ? <ReportIcon /> : item.icon === "profile" ? <ProfileIcon /> : <HeartIcon />}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </Link>
            );
          })}
          <Link
            className={pathname === "/home/profile" ? "mf-workspace-nav-item mf-mobile-profile-link active" : "mf-workspace-nav-item mf-mobile-profile-link"}
            href="/home/profile"
            aria-current={pathname === "/home/profile" ? "page" : undefined}
          >
            <span className="mf-workspace-nav-icon"><UserIcon /></span>
            <span><strong>个人中心</strong></span>
          </Link>
        </nav>

        <div className="mf-workspace-account" aria-label="账户选项">
          <Link
            className={pathname === "/home/profile" ? "active" : undefined}
            href="/home/profile"
            aria-current={pathname === "/home/profile" ? "page" : undefined}
          >
            <span className="mf-workspace-nav-icon"><UserIcon /></span>
            <span>个人中心</span>
          </Link>
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
            <button type="button" aria-label="关闭工作台菜单" onClick={closeMobileMenu}>×</button>
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
                  <span className="mf-workspace-nav-icon">{item.icon === "report" ? <ReportIcon /> : item.icon === "profile" ? <ProfileIcon /> : <HeartIcon />}</span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                </Link>
              );
            })}
            <Link
              className={pathname === "/home/profile" ? "mf-workspace-nav-item active" : "mf-workspace-nav-item"}
              href="/home/profile"
              aria-current={pathname === "/home/profile" ? "page" : undefined}
              onClick={() => mobileMenuRef.current?.close()}
            >
              <span className="mf-workspace-nav-icon"><UserIcon /></span>
              <span><strong>个人中心</strong><small>管理你的基础资料</small></span>
            </Link>
          </nav>

          <div className="mf-mobile-menu-account">
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
          </div>
        </div>
      </dialog>

      <main className="mf-workspace-main">
        {status === "authenticated" && missingProfileFields.length > 0 && pathname !== "/home/profile" ? (
          <aside className="mf-profile-completion-banner" aria-label="完善个人资料提醒">
            <div><span>完善专属资料</span><strong>还差{missingProfileFields.join("和")}，完整报告会更贴合你</strong></div>
            <Link href="/home/profile">现在填写 <span>→</span></Link>
          </aside>
        ) : null}
        {children}
      </main>
    </div>
  );
}
