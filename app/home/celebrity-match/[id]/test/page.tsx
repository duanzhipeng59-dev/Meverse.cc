import { notFound } from "next/navigation";
import { getStar, stars } from "../../../../myfate-data";
import WorkspaceTestEntry from "./workspace-test-entry";

export function generateStaticParams() {
  return stars.map((star) => ({ id: star.id }));
}

export default async function WorkspaceTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ restart?: string }>;
}) {
  const star = getStar((await params).id);
  if (!star) notFound();

  return <WorkspaceTestEntry star={star} allowRetest={(await searchParams).restart === "1"} />;
}
