"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "../auth-context";

const menuItems = [
  {
    icon: "heart",
    label: "生辰画像",
    description: "TA 的生辰命理画像",
    href: "/home/relationship-test",
  },
  {
    icon: "dual",
    label: "双人合盘",
    description: "两位偶像的八字合盘",
    href: "/home/dual-star-match",
  },
];

// 手机端底部导航:两个一级 Tab(个人中心固定在顶栏右上角)
const tabItems = [
  { icon: "heart", label: "生辰画像", href: "/home/relationship-test" },
  { icon: "dual", label: "双人合盘", href: "/home/dual-star-match" },
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

function UpgradeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 8.25h15v10.5h-15z" />
      <path d="M4.5 11.25h15M8 8.25c-1.9 0-3-1-3-2.15 0-1.05.75-1.85 1.85-1.85C8.55 4.25 10 6.1 12 8.25M16 8.25c1.9 0 3-1 3-2.15 0-1.05-.75-1.85-1.85-1.85C15.45 4.25 14 6.1 12 8.25M12 8.25v10.5" />
    </svg>
  );
}

function MenuIcon({ icon }: { icon: string }) {
  if (icon === "dual") return <DualIcon />;
  if (icon === "user") return <UserIcon />;
  return <HeartIcon />;
}

function DualIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.5 3.5v2M8.5 21v-2M2.5 9.5h2M18.5 9.5h-3" transform="translate(1 2.5)" />
      <path d="M9 15.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" transform="translate(-1 -1)" />
      <path d="M16.5 19a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
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

export default function WorkspaceShell({ children, upgradesEnabled = true }: { children: ReactNode; upgradesEnabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, markSignedOut } = useAuth();
  const isDetail = pathname.split("/").filter(Boolean).length > 2;
  const loginHref = `/login?next=${encodeURIComponent(pathname)}&from=${encodeURIComponent(pathname)}`;
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // 路由预热:点击菜单/Tab 时骨架立即接管(动态页 RSC 需要数百毫秒,不预热会滞留旧页)
  useEffect(() => {
    for (const item of [...menuItems, ...tabItems]) router.prefetch(item.href);
  }, [router]);

  return (
    <div className={isDetail ? "mf-workspace-shell is-detail" : "mf-workspace-shell"}>
      <header className="mf-workspace-mobile-bar">
        <Link className="mf-workspace-brand" href="/" aria-label="返回 Myfate 首页">Myfate</Link>
        <Link
          className={pathname === "/home/profile" ? "mf-mobile-profile-btn is-active" : "mf-mobile-profile-btn"}
          href="/home/profile"
          aria-label="个人中心"
          aria-current={pathname === "/home/profile" ? "page" : undefined}
        >
          个人中心
        </Link>
      </header>

      <aside className="mf-workspace-sidebar">
        <Link className="mf-workspace-brand" href="/" aria-label="返回 Myfate 首页">
          <span className="mf-brand-mark">M</span>
          <span>Myfate</span>
        </Link>

        <div className="mf-workspace-label">探索</div>
        <nav className="mf-workspace-nav" aria-label="工作台主菜单">
          {menuItems.map((item) => (
            <Link
              className={isActive(item.href) ? "mf-workspace-nav-item active" : "mf-workspace-nav-item"}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              key={item.href}
            >
              <span className="mf-workspace-nav-icon"><MenuIcon icon={item.icon} /></span>
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </Link>
          ))}
        </nav>

        <div className="mf-workspace-account" aria-label="账户选项">
          {upgradesEnabled ? (
          <Link
            className={pathname === "/home/upgrade" ? "active" : undefined}
            href="/home/upgrade"
            aria-current={pathname === "/home/upgrade" ? "page" : undefined}
          >
            <span className="mf-workspace-nav-icon"><UpgradeIcon /></span>
            <span>订阅升级</span>
          </Link>
          ) : null}
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

      <main className="mf-workspace-main">
        {children}
      </main>

      <nav className="mf-mobile-tabbar" aria-label="底部导航">
        {tabItems.map((item) => (
          <Link
            className={isActive(item.href) ? "mf-mobile-tab is-active" : "mf-mobile-tab"}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            key={item.href}
          >
            <span className="mf-mobile-tab-icon"><MenuIcon icon={item.icon} /></span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
