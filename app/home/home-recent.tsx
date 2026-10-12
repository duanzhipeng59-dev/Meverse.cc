"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { portraitImage } from "../myfate-image";

type RecentItem = { starId: string; name: string; portraitSrc: string };

// 首页「最近阅读」:服务端浏览记录(登录用户);未登录或无记录则整节隐藏。
export default function HomeRecent() {
  const [items, setItems] = useState<RecentItem[] | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/myfate/star-report-views", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ views?: Array<{ starId: string; name: string; portraitSrc: string }> }>) : null))
      .then((data) => {
        if (!active) return;
        setItems((data?.views ?? []).slice(0, 5).map((view) => ({ starId: view.starId, name: view.name, portraitSrc: view.portraitSrc })));
      })
      .catch(() => { if (active) setItems([]); });
    return () => { active = false; };
  }, []);

  if (items === null || items.length === 0) return null;

  return (
    <section className="mf-home2-section" aria-label="最近阅读">
      <h2>最近阅读</h2>
      <div className="mf-home2-recent">
        {items.map((item) => (
          <Link href={`/home/relationship-test/${item.starId}`} key={item.starId}>
            <span style={{ backgroundImage: `url("${portraitImage(item.portraitSrc, 120)}")` }} role="img" aria-label={item.name} />
            <b>{item.name}</b>
          </Link>
        ))}
      </div>
    </section>
  );
}
