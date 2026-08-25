import { notFound } from "next/navigation";
import { getStar, stars } from "../../myfate-data";
import MyfateTest from "../../myfate-test";

export function generateStaticParams() {
  return stars.map((star) => ({ id: star.id }));
}

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const star = getStar((await params).id);
  if (!star) notFound();
  return <MyfateTest star={star} />;
}
