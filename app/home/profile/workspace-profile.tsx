"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../auth-context";
import { portraitImage } from "../../myfate-image";
import { readRecentStars } from "../celebrity-match/celebrity-browser";
import { readFavorites } from "../relationship-test/[id]/preview-actions";
import { EmptyState } from "../../components/ui";
import type { StarListItem } from "../../myfate-stars-server";

// 我的页:邮箱/收藏人物/最近浏览/报告历史入口/AI 对话说明/退出。
// 收藏与最近浏览来自本地记录(登录同步属持久化批次);免费化后无任何额度/套餐/订单内容。
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

  return (
    <div className="mf-me">
      <section className="mf-bz-account-card">
        <div className="mf-bz-account-details">
          <div>
            <span>邮箱</span>
            <b>{email ?? "尚未登录"}</b>
          </div>
        </div>
        {status === "anonymous" ? (
          <Link className="mf-bz-account-button" href="/login?next=%2Fhome%2Fprofile&from=%2Fhome%2Fprofile">登录</Link>
        ) : (
          <button className="mf-bz-account-button" type="button" onClick={() => { markSignedOut(); router.replace("/"); }}>退出登录</button>
        )}
      </section>
      {status === "anonymous" ? (
        <p className="mf-me-note">登录后可跨设备同步收藏、阅读位置与追问记录;浏览和查看报告无需登录。</p>
      ) : null}

      <StarRow title="收藏人物" empty="还没有收藏,在人物页点♡收藏" list={favs} />
      <StarRow title="最近浏览" empty="暂无浏览记录,去发现页看看" list={recent} />

      <section className="mf-me-links" aria-label="历史与对话">
        <Link href="/home/reports"><b>报告历史</b><span>已生成的报告与浏览记录 →</span></Link>
        <div className="mf-me-links-static"><b>AI 对话记录</b><span>追问对话保存在各报告页内,打开报告即可继续对话</span></div>
      </section>
    </div>
  );
}

function StarRow({ title, empty, list }: { title: string; empty: string; list: StarListItem[] }) {
  return (
    <section className="mf-me-section" aria-label={title}>
      <h2>{title}</h2>
      {list.length === 0 ? (
        <p className="mf-me-empty">{empty}</p>
      ) : (
        <div className="mf-me-row">
          {list.map((star) => (
            <Link href={`/home/relationship-test/${star.id}`} key={star.id}>
              <span style={{ backgroundImage: `url("${portraitImage(star.portraitSrc, 120)}")` }} role="img" aria-label={star.name} />
              <b>{star.name}</b>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
