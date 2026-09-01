import { redirect } from "next/navigation";

export default async function LegacyCelebrityTestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.set(key, value);
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  redirect(`/home/relationship-test/${(await params).id}/test${suffix}`);
}
