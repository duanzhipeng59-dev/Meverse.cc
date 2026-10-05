import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import DualStarPicker from "./dual-star-picker";
import { getDualStarCandidates, getUserDualReports } from "../../myfate-dual-server";
import { getPublishedStar } from "../../myfate-stars-server";
import { isUpgradesEnabled } from "../../myfate-settings";
import { getOptionalPageUser } from "../../require-page-user";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "双人合盘" };

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const STATUS_LABELS: Record<string, string> = { ready: "已生成", generating: "生成中", failed: "生成失败" };

export default async function DualStarMatchPage({ searchParams }: { searchParams: Promise<{ star?: string }> }) {
  const { star } = await searchParams;
  // 明星详情页带入的首位明星必须是已发布明星
  let initialStarId: string | null = null;
  if (star && ID_PATTERN.test(star)) {
    const published = await getPublishedStar(star);
    if (published) initialStarId = star;
    else notFound();
  }
  const [candidates, upgradesEnabled, user] = await Promise.all([getDualStarCandidates(), isUpgradesEnabled(), getOptionalPageUser("/home/dual-star-match")]);
  const history = user ? await getUserDualReports(user.id).catch(() => []) : [];
  // 历史横条用中文名(与报告页固定要求一致)
  const personOf = (id: string, fallback: string) => {
    const candidate = candidates.find((item) => item.id === id);
    if (!candidate) return fallback;
    const dash = candidate.role.indexOf("-");
    return dash > 0 ? candidate.role.slice(dash + 1).trim() : candidate.name;
  };
  return (
    <>
      <DualStarPicker candidates={candidates} initialStarId={initialStarId} upgradesEnabled={upgradesEnabled} />
      {history.length ? (
        <section className="mf-dual mf-dual-history-zone" aria-label="历史合盘记录">
          <h2>历史合盘</h2>
          <div className="mf-dual-history-list">
            {history.map((row) => {
              // 服务端为 UTC,统一按东八区展示
              const shifted = new Date(new Date(row.createdAt).getTime() + 8 * 3600_000);
              const time = `${shifted.getUTCMonth() + 1}月${shifted.getUTCDate()}日 ${String(shifted.getUTCHours()).padStart(2, "0")}:${String(shifted.getUTCMinutes()).padStart(2, "0")}`;
              return (
                <Link className="mf-dual-history-row" href={`/home/dual-star-match/reports/${row.id}`} key={row.id}>
                  <span className="mf-dual-history-avatars">
                    <Image src={row.portraitA} alt="" width={30} height={39} unoptimized />
                    <i aria-hidden="true">&amp;</i>
                    <Image src={row.portraitB} alt="" width={30} height={39} unoptimized />
                  </span>
                  <b>{personOf(row.starA, row.nameA)} × {personOf(row.starB, row.nameB)}</b>
                  <small>{time}</small>
                  <em data-status={row.status}>{STATUS_LABELS[row.status] ?? row.status}</em>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
