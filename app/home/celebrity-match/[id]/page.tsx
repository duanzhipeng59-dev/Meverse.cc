import { redirect } from "next/navigation";

export default async function LegacyCelebrityPage({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/home/relationship-test/${(await params).id}`);
}
