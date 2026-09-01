import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CelebrityDetail from "../../../celebrity-detail";
import { stars } from "../../../myfate-data";
import { getPublishedStar } from "../../../myfate-stars-server";

export function generateStaticParams() {
  return stars.map((star) => ({ id: star.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const star = await getPublishedStar((await params).id);
  return { title: star ? `你更适合成为 ${star.name} 的谁` : "关系测试" };
}

export default async function RelationshipTargetPage({ params }: { params: Promise<{ id: string }> }) {
  const star = await getPublishedStar((await params).id);
  if (!star) notFound();
  return <CelebrityDetail star={star} backHref="/home/relationship-test" workspace />;
}
