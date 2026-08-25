import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CelebrityDetail from "../../celebrity-detail";
import { getStar, stars } from "../../myfate-data";

export function generateStaticParams() {
  return stars.map((star) => ({ id: star.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const star = getStar((await params).id);
  return { title: star ? `${star.name}与你的缘分测试` : "心动对象" };
}

export default async function CelebrityPage({ params }: { params: Promise<{ id: string }> }) {
  const star = getStar((await params).id);
  if (!star) notFound();

  return <CelebrityDetail star={star} backHref="/home/celebrity-match" />;
}
