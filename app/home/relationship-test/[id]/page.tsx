import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CelebrityDetail from "../../../celebrity-detail";
import ReportDetailWorkspace from "../../reports/[id]/report-detail-workspace";
import { getPublishedStar, getPublishedStars, getStarBaziBrief } from "../../../myfate-stars-server";
import { requirePageUser } from "../../../require-page-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "明星合盘" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export default async function RelationshipTargetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageUser(`/home/relationship-test/${id}`);
  if (UUID_PATTERN.test(id)) {
    return <ReportDetailWorkspace reportId={id} section="relationship-test" />;
  }
  const [star, allStars] = await Promise.all([getPublishedStar(id), getPublishedStars()]);
  if (!star) notFound();
  const [others, bazi] = await Promise.all([
    Promise.resolve(allStars.filter(item => item.id !== star.id).slice(0, 8)), // legacy star view
    getStarBaziBrief(id),
  ]);
  return <CelebrityDetail star={star} backHref="/home" workspace others={others} baziBrief={bazi.brief} baziHeadline={bazi.headline} />;
}
