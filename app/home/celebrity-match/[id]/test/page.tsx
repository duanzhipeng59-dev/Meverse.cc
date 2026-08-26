import { notFound } from "next/navigation";
import { stars } from "../../../../myfate-data";
import { getPublishedStar } from "../../../../myfate-stars-server";
import WorkspaceTestEntry from "./workspace-test-entry";

export function generateStaticParams() {
  return stars.map((star) => ({ id: star.id }));
}

export default async function WorkspaceTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ restart?: string; resume?: string }>;
}) {
  const star = await getPublishedStar((await params).id);
  if (!star) notFound();

  const query = await searchParams;
  return <WorkspaceTestEntry star={star} allowRetest={query.restart === "1" || query.resume === "1"} />;
}
