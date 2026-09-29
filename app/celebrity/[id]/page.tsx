import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CelebrityPage({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/home/relationship-test/${encodeURIComponent((await params).id)}`);
}
