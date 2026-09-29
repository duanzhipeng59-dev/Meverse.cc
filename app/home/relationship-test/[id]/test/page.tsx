import { notFound } from "next/navigation";
import MyfateGeneratedTest from "../../../../myfate-generated-test";
import { getPublishedStar } from "../../../../myfate-stars-server";
import { requirePageUser } from "../../../../require-page-user";

export const dynamic = "force-dynamic";

export default async function RelationshipTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePageUser(`/home/relationship-test/${id}/test`);
  const star = await getPublishedStar(id);
  if (!star) notFound();
  return <MyfateGeneratedTest star={star} workspace />;
}
