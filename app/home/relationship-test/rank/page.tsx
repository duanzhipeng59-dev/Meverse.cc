import type { Metadata } from "next";
import { z } from "zod";
import RankWorkspace from "./rank-workspace";
import { requirePageUser } from "../../../require-page-user";

export const dynamic = "force-dynamic";

const schema = z.object({
  birth: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/u).optional(),
  city: z.string().max(60).optional(),
});

export const metadata: Metadata = { title: "偶像适配榜" };

export default async function RankPage({ searchParams }: { searchParams: Promise<{ birth?: string; city?: string }> }) {
  await requirePageUser("/home/relationship-test");
  const parsed = schema.safeParse(await searchParams);
  const birth = parsed.success ? parsed.data.birth : undefined;
  const city = parsed.success ? parsed.data.city : undefined;
  return <RankWorkspace initialBirth={birth} initialCity={city} />;
}
