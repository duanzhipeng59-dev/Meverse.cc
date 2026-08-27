import { notFound } from "next/navigation";
import { stars } from "../../../../myfate-data";
import { getPublishedStar } from "../../../../myfate-stars-server";
import { getQuestionsForStar } from "../../../../myfate-questions-server";
import WorkspaceTestEntry from "./workspace-test-entry";

export function generateStaticParams() {
  return stars.map((star) => ({ id: star.id }));
}

export default async function WorkspaceTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const star = await getPublishedStar((await params).id);
  if (!star) notFound();
  const questions = await getQuestionsForStar(star);

  return <WorkspaceTestEntry star={star} questions={questions} />;
}
