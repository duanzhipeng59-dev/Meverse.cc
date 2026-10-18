"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import LoginModal from "../../components/login-modal";
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
    // 收藏与最近浏览仅登录后展示;未登录一律空(显示引导态)
    if (status !== "authenticated") {
      setFavs([]);
      setRecent([]);
      return;
    }
    const byId = new Map(stars.map((star) => [star.id, star]));
    setFavs(readFavorites().map((id) => byId.get(id)).filter((x): x is StarListItem => Boolean(x)));
    setRecent(readRecentStars().map((id) => byId.get(id)).filter((x): x is StarListItem => Boolean(x)));
  }, [stars, status]);

  if (status === "loading") {
    return <div className="mf-bz-profile"><p className="mf-bz-profile-loading">正在读取…</p></div>;
  }

  const loggedIn = status === "authenticated";

  return (
    <div className="mf-me">
      <section className="mf-me-account" aria-label="账户">
        <div className="mf-me-account-copy">
          <b>{loggedIn ? email : "尚未登录"}</b>
          {loggedIn ? null : <p>登录后可同步收藏、浏览记录，以及查看完整报告</p>}
        </div>
        {loggedIn ? (
          <button type="button" className="mf-me-logout" onClick={() => { markSignedOut(); router.replace("/"); }}>退出登录</button>
        ) : (
          <LoginModal className="mf-me-login">登录</LoginModal>
        )}
      </section>

      <PeopleRow title="收藏人物" empty={loggedIn ? "还没有收藏,在人物页点 ♡ 收藏" : "登录之后即可查看收藏记录"} list={favs} />
      <PeopleRow title="最近浏览" empty={loggedIn ? "暂无浏览记录,去发现页看看" : "登录之后即可查看浏览记录"} list={recent} />
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
            <Link href={`/home/relationship-test/${star.id}?from=profile`} key={star.id}>
              <span style={{ backgroundImage: `url("${portraitImage(star.portraitSrc, 240)}")` }} role="img" aria-label={star.name} />
              <b>{star.name}</b>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
