"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import { portraitImage } from "../../myfate-image";
import { readRecentStars } from "../celebrity-match/celebrity-browser";
import { readFavorites } from "../relationship-test/[id]/preview-actions";
import type { StarListItem } from "../../myfate-stars-server";

// 我的页:账户卡(头像/邮箱+说明+登录或退出) / 收藏人物 / 最近浏览 / 功能入口。
// 规格:区块间距 28px、卡片内边距 20px、人物图 88×112、登录按钮 48px、功能入口 64px。
export default function WorkspaceProfile({ stars }: { stars: StarListItem[] }) {
  const { status, email, markSignedOut } = useAuth();
  const router = useRouter();
  const [favs, setFavs] = useState<StarListItem[]>([]);
  const [recent, setRecent] = useState<StarListItem[]>([]);

  useEffect(() => {
    const byId = new Map(stars.map((star) => [star.id, star]));
    setFavs(readFavorites().map((id) => byId.get(id)).filter((x): x is StarListItem => Boolean(x)));
    setRecent(readRecentStars().map((id) => byId.get(id)).filter((x): x is StarListItem => Boolean(x)));
  }, [stars]);

  if (status === "loading") {
    return <div className="mf-bz-profile"><p className="mf-bz-profile-loading">正在读取…</p></div>;
  }

  const loggedIn = status === "authenticated";
  const initial = (email ?? "").trim().charAt(0).toUpperCase();

  return (
    <div className="mf-me">
      <section className="mf-me-account" aria-label="账户">
        <span className="mf-me-avatar" aria-hidden="true">
          {loggedIn && initial ? initial : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="8" r="3.25" /><path d="M5.5 19c.8-3.2 3-4.8 6.5-4.8s5.7 1.6 6.5 4.8" /></svg>}
        </span>
        <div className="mf-me-account-copy">
          <b>{loggedIn ? email : "尚未登录"}</b>
          <p>登录后同步收藏、阅读位置和 AI 对话记录</p>
        </div>
        {loggedIn ? (
          <button type="button" className="mf-me-logout" onClick={() => { markSignedOut(); router.replace("/"); }}>退出</button>
        ) : (
          <Link className="mf-me-login" href="/login?next=%2Fhome%2Fprofile&from=%2Fhome%2Fprofile">登录</Link>
        )}
      </section>

      <PeopleRow title="收藏人物" empty="还没有收藏,在人物页点 ♡ 收藏" list={favs} />
      <PeopleRow title="最近浏览" empty="暂无浏览记录,去发现页看看" list={recent} />

      <nav className="mf-me-links" aria-label="功能入口">
        <Link href="/home/reports"><b>报告历史</b><span>查看与生成的报告</span><i aria-hidden="true">›</i></Link>
        <div className="mf-me-links-static"><b>AI 对话记录</b><span>保存在各报告页内</span></div>
      </nav>
    </div>
  );
}

function PeopleRow({ title, empty, list }: { title: string; empty: string; list: StarListItem[] }) {
  return (
    <section className="mf-me-section" aria-label={title}>
      <h2>{title}</h2>
      {list.length === 0 ? (
        <div className="mf-me-empty"><i aria-hidden="true">◌</i><p>{empty}</p></div>
      ) : (
        <div className="mf-me-row">
          {list.map((star) => (
            <Link href={`/home/relationship-test/${star.id}`} key={star.id}>
              <span style={{ backgroundImage: `url("${portraitImage(star.portraitSrc, 240)}")` }} role="img" aria-label={star.name} />
              <b>{star.name}</b>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
