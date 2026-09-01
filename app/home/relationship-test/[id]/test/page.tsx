import { notFound } from "next/navigation";
import { stars } from "../../../../myfate-data";
import MyfateGeneratedTest from "../../../../myfate-generated-test";
import { getPublishedStar } from "../../../../myfate-stars-server";

export function generateStaticParams() {
  return stars.map((star) => ({ id: star.id }));
}

export default async function RelationshipTestPage({ params }: { params: Promise<{ id: string }> }) {
  const star = await getPublishedStar((await params).id);
  if (!star) notFound();
  return <MyfateGeneratedTest star={star} workspace />;
}
