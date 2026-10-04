import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DualStarPicker from "./dual-star-picker";
import { getDualStarCandidates } from "../../myfate-dual-server";
import { getPublishedStar } from "../../myfate-stars-server";
import { isUpgradesEnabled } from "../../myfate-settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "偶像合盘" };

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export default async function DualStarMatchPage({ searchParams }: { searchParams: Promise<{ star?: string }> }) {
  const { star } = await searchParams;
  // 明星详情页带入的首位明星必须是已发布明星
  let initialStarId: string | null = null;
  if (star && ID_PATTERN.test(star)) {
    const published = await getPublishedStar(star);
    if (published) initialStarId = star;
    else notFound();
  }
  const [candidates, upgradesEnabled] = await Promise.all([getDualStarCandidates(), isUpgradesEnabled()]);
  return <DualStarPicker candidates={candidates} initialStarId={initialStarId} upgradesEnabled={upgradesEnabled} />;
}
