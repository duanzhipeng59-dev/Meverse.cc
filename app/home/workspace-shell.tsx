"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "../auth-context";
import LoginModal from "../components/login-modal";

// 一级导航两页:发现/解读(桌面侧栏与移动底部导航同源);根路径直接进发现
const menuItems = [
  { icon: "heart", label: "发现", description: "浏览与搜索人物画像", href: "/home/relationship-test" },
  { icon: "dual", label: "解读", description: "单人与双人八字解读排盘", href: "/home/dual-star-match" },
];

// 底部 Tab 三项:发现/解读/我的(我的=个人中心入口,未登录点它弹登录)
const tabItems = [
  { icon: "heart", label: "发现", href: "/home/relationship-test" },
  { icon: "dual", label: "解读", href: "/home/dual-star-match" },
  { icon: "user", label: "我的", href: "/home/profile" },
];

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.5 9.1c0 4.7-8.5 9.4-8.5 9.4S3.5 13.8 3.5 9.1A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.5 2.4Z" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3.5h9L19 7.5V20a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 20V3.5Z" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2.5" />
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

function MenuIcon({ icon }: { icon: string }) {
  if (icon === "dual") return <DualIcon />;
  if (icon === "user") return <UserIcon />;
  if (icon === "report") return <ReportIcon />;
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

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status, markSignedOut } = useAuth();
  const isDetail = pathname.split("/").filter(Boolean).length > 2;

  // All workspace routes share document scrolling. Normal navigation starts at
  // the top; browser history navigation restores the position of that route.
  const previousPathRef = useRef<string | null>(null);
  const historyNavigationRef = useRef(false);
  const positionsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const markHistoryNavigation = () => { historyNavigationRef.current = true; };
    window.addEventListener("popstate", markHistoryNavigation);
    return () => window.removeEventListener("popstate", markHistoryNavigation);
  }, []);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    if (previousPath === null) { previousPathRef.current = pathname; return; }
    if (previousPath === pathname) return;
    positionsRef.current.set(previousPath, window.scrollY);
    const isHistoryNavigation = historyNavigationRef.current;
    historyNavigationRef.current = false;
    previousPathRef.current = pathname;
    const target = isHistoryNavigation ? (positionsRef.current.get(pathname) ?? 0) : 0;
    window.scrollTo({ top: target, left: 0, behavior: "auto" });
  }, [pathname]);
  // /home 是所有页面的前缀,必须精确匹配;其余路由按前缀归属
  const isActive = (href: string) => (href === "/home" ? pathname === "/home" : pathname === href || pathname.startsWith(`${href}/`));

  // 路由预热:点击菜单/Tab 时骨架立即接管(动态页 RSC 需要数百毫秒,不预热会滞留旧页)
  useEffect(() => {
    for (const item of [...menuItems, ...tabItems]) router.prefetch(item.href);
  }, [router]);

  return (
    <div className={isDetail ? "mf-workspace-shell is-detail" : "mf-workspace-shell"}>
      <header className="mf-workspace-mobile-bar">
        <Link className="mf-workspace-brand" href="/" aria-label="返回 MeVerse 首页">
          <span className="mf-meverse-logo" role="img" aria-label="MeVerse" />
        </Link>
      </header>

      <aside className="mf-workspace-sidebar">
        <Link className="mf-workspace-brand" href="/" aria-label="返回 MeVerse 首页">
          <span className="mf-meverse-logo" role="img" aria-label="MeVerse" />
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
        {status === "authenticated" ? (
          <Link
            className={pathname === "/home/profile" ? "active" : undefined}
            href="/home/profile"
            aria-current={pathname === "/home/profile" ? "page" : undefined}
          >
            <span className="mf-workspace-nav-icon"><UserIcon /></span>
            <span>个人中心</span>
          </Link>
        ) : (
          <LoginModal className="mf-workspace-account-login">
            <span className="mf-workspace-nav-icon"><UserIcon /></span>
            <span>个人中心</span>
          </LoginModal>
        )}
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
            <LoginModal>
              <span className="mf-workspace-nav-icon"><LogoutIcon /></span>
              <span>登录</span>
            </LoginModal>
          )}
        </div>
      </aside>

      <main className="mf-workspace-main">
        {children}
      </main>

      <nav className="mf-mobile-tabbar" aria-label="底部导航">
        {tabItems.map((item) => item.href === "/home/profile" && status !== "authenticated" ? (
          <LoginModal className="mf-mobile-tab" key={item.href}>
            <span className="mf-mobile-tab-icon"><MenuIcon icon={item.icon} /></span>
            <span>{item.label}</span>
          </LoginModal>
        ) : (
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
