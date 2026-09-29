import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CelebrityDetail from "../../../celebrity-detail";
import { getPublishedStar } from "../../../myfate-stars-server";
import { requirePageUser } from "../../../require-page-user";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "明星合盘" };

export default async function RelationshipTargetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageUser(`/home/relationship-test/${id}`);
  const star = await getPublishedStar(id);
  if (!star) notFound();
  return <CelebrityDetail star={star} backHref="/home/relationship-test" workspace />;
}
