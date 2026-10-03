// 双星合盘服务端数据层:候选明星(含资料完整度)、用户报告列表、单份报告读取。
import { createSupabaseAdminClient } from "./api/auth/server";

export type DualStarCandidate = {
  id: string;
  name: string;
  role: string;
  portraitSrc: string;
  birthDate: string;
  birthPlace: string;
  hasFullBirth: boolean;
};

type CandidateRow = {
  id: string;
  name: string;
  role: string | null;
  portrait_url: string | null;
  birth_date: string;
  birth_time: string | null;
  birth_place: string | null;
};

let candidatesCache: { at: number; data: DualStarCandidate[] } | null = null;

// 候选列表为公共数据,60 秒内存缓存
export async function getDualStarCandidates(): Promise<DualStarCandidate[]> {
  if (candidatesCache && Date.now() - candidatesCache.at < 60_000) return candidatesCache.data;
  const { data, error } = await createSupabaseAdminClient()
    .from("celebrity_profiles")
    .select("id,name,role,portrait_url,birth_date,birth_time,birth_place")
    .eq("published", true)
    .order("sort_order", { ascending: true })
    .returns<CandidateRow[]>();
  if (error) throw error;
  const list = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role ?? "明星",
    portraitSrc: row.portrait_url ?? "",
    birthDate: row.birth_date,
    birthPlace: row.birth_place ?? "",
    hasFullBirth: Boolean(row.birth_date && row.birth_time && row.birth_place),
  }));
  candidatesCache = { at: Date.now(), data: list };
  return list;
}

export type DualReportRow = {
  id: string;
  userId: string;
  starA: string;
  starB: string;
  nameA: string;
  nameB: string;
  portraitA: string;
  portraitB: string;
  status: "generating" | "ready" | "failed";
  keywords: string[];
  summary: string;
  content: unknown;
  error: string | null;
  createdAt: string;
};

type RawRow = {
  id: string;
  user_id: string;
  star_a: string;
  star_b: string;
  status: string;
  keywords: unknown;
  summary: string;
  content: unknown;
  error: string | null;
  created_at: string;
};


async function profilesFor(ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return new Map<string, { name: string; portrait: string }>();
  const { data, error } = await createSupabaseAdminClient()
    .from("celebrity_profiles")
    .select("id,name,portrait_url")
    .in("id", unique);
  if (error) throw error;
  return new Map((data ?? []).map((row: { id: string; name: string; portrait_url: string | null }) => [row.id, { name: row.name, portrait: row.portrait_url ?? "" }]));
}

function mapRow(row: RawRow, profiles: Map<string, { name: string; portrait: string }>): DualReportRow {
  return {
    id: row.id,
    userId: row.user_id,
    starA: row.star_a,
    starB: row.star_b,
    nameA: profiles.get(row.star_a)?.name ?? row.star_a,
    nameB: profiles.get(row.star_b)?.name ?? row.star_b,
    portraitA: profiles.get(row.star_a)?.portrait ?? "",
    portraitB: profiles.get(row.star_b)?.portrait ?? "",
    status: (row.status === "ready" || row.status === "failed" ? row.status : "generating") as DualReportRow["status"],
    keywords: Array.isArray(row.keywords) ? row.keywords as string[] : [],
    summary: row.summary ?? "",
    content: row.content,
    error: row.error,
    createdAt: row.created_at,
  };
}

export async function getUserDualReports(userId: string): Promise<DualReportRow[]> {
  const { data, error } = await createSupabaseAdminClient()
    .from("dual_star_reports")
    .select("id,user_id,star_a,star_b,status,keywords,summary,content,error,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<RawRow[]>();
  if (error) throw error;
  const profiles = await profilesFor((data ?? []).flatMap((row) => [row.star_a, row.star_b]));
  return (data ?? []).map((row) => mapRow(row, profiles));
}

export async function getDualReport(id: string): Promise<DualReportRow | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("dual_star_reports")
    .select("id,user_id,star_a,star_b,status,keywords,summary,content,error,created_at")
    .eq("id", id)
    .maybeSingle()
    .returns<RawRow | null>();
  if (error) throw error;
  if (!data) return null;
  const profiles = await profilesFor([data.star_a, data.star_b]);
  return mapRow(data, profiles);
}

// 同组合(不分顺序)最近一份已生成报告
export async function findExistingDualReport(userId: string, starA: string, starB: string): Promise<DualReportRow | null> {
  const [a, b] = [starA, starB].sort();
  const { data, error } = await createSupabaseAdminClient()
    .from("dual_star_reports")
    .select("id,user_id,star_a,star_b,status,keywords,summary,content,error,created_at")
    .eq("user_id", userId)
    .eq("star_a", a)
    .eq("star_b", b)
    .eq("status", "ready")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
    .returns<RawRow | null>();
  if (error) throw error;
  if (!data) return null;
  const profiles = await profilesFor([data.star_a, data.star_b]);
  return mapRow(data, profiles);
}
