import { notFound } from "next/navigation";
import { stars } from "../../myfate-data";
import { getPublishedStar } from "../../myfate-stars-server";
import { getQuestionsForStar } from "../../myfate-questions-server";
import MyfateTest from "../../myfate-test";

export function generateStaticParams() {
  return stars.map((star) => ({ id: star.id }));
}

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const star = await getPublishedStar((await params).id);
  if (!star) notFound();
  const questions = await getQuestionsForStar(star);
  if (!questions.length) notFound();
  return <MyfateTest star={star} questions={questions} />;
}
