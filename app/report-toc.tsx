"use client";

import { useEffect, useRef, useState } from "react";

export type TocItem = { id: string; label: string };

// 两类报告页共用章节导航:吸顶于顶部栏下方,滚动跟踪当前章节(玫红文字+短下划线),
// 手机端横向滑动隐藏滚动条,当前栏目自动滚入可见区域。
export default function ReportToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const navRef = useRef<HTMLElement | null>(null);
  // 点击跳转后短暂锁定高亮为点击项,避免惯性滚动期间被位置跟踪覆盖
  const lockUntil = useRef(0);

  useEffect(() => {
    // 顶栏+导航吸顶占位高度;最后一个越过该线的章节即当前章节
    const threshold = 130;
    let raf = 0;
    const update = () => {
      if (Date.now() < lockUntil.current) return;
      let current = items[0]?.id ?? "";
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= threshold) current = item.id;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items]);

  function onJump(id: string, event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    // 精确滚动到吸顶条(顶栏+导航)下方,不依赖浏览器锚点的 scroll-margin 行为
    const y = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    window.history.replaceState(null, "", `#${id}`);
    lockUntil.current = Date.now() + 1000;
    setActive(id);
  }

  useEffect(() => {
    const nav = navRef.current;
    const el = nav?.querySelector<HTMLElement>(`a[data-toc="${active}"]`);
    if (nav && el) {
      const left = el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2;
      nav.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }, [active]);

  return (
    <nav className="mf-zr-toc" ref={navRef} aria-label="报告目录">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          data-toc={item.id}
          onClick={(event) => onJump(item.id, event)}
          className={active === item.id ? "is-active" : undefined}
          aria-current={active === item.id ? "true" : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
