import { unstable_noStore as noStore } from "next/cache";
import { createSupabaseAdminClient } from "./api/auth/server";
import { buildBaziChart } from "./myfate-bazi-engine";
import { buildStarBaziBrief, buildStarBaziHeadline } from "./myfate-star-bazi-report";
import { createDefaultCelebrityReportPrompt, getStar, stars, type StarProfile } from "./myfate-data";
import { createServerCache } from "./server-cache";
import { STAR_SNAPSHOT } from "./myfate-star-snapshot";

type CelebrityRow = {
  id: string;
  name: string;
  role: string;
  tagline: string;
  description: string;
  relationship_style: string;
  focus: string;
  mbti: string;
  birth_date: string;
  three_pillars: string;
  traits: string[];
  categories: string[];
  match_count: number;
  portrait_url: string;
  ideal: StarProfile["ideal"] & { _reportPrompt?: string };
  report_prompt?: string | null;
  birth_time?: string | null;
  birth_place?: string | null;
  birth_lat?: number | null;
  birth_lon?: number | null;
  birth_tz?: string | null;
  gender?: "male" | "female" | "other" | "unknown" | null;
  created_at?: string | null;
};

export type CelebrityVedicBirth = {
  starId: string;
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  lat: number;
  lon: number;
  tz: string;
  gender: "male" | "female" | "other" | "unknown";
};

const profileSelection = "id,name,role,tagline,description,relationship_style,focus,mbti,birth_date,three_pillars,traits,categories,match_count,portrait_url,ideal,gender,created_at";
const reportSelection = `${profileSelection},report_prompt`;

function hasCloudConfig() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function mapCelebrity(row: CelebrityRow): StarProfile {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    tagline: row.tagline,
    description: row.description,
    relationshipStyle: row.relationship_style,
    focus: row.focus,
    mbti: row.mbti,
    birthDate: row.birth_date,
    threePillars: row.three_pillars,
    traits: row.traits,
    categories: row.categories,
    gender: row.gender ?? "unknown",
    createdAt: row.created_at ?? undefined,
    matchCount: String(row.match_count),
    portraitSrc: row.portrait_url,
    ideal: {
      security: row.ideal.security,
      expression: row.ideal.expression,
      independence: row.ideal.independence,
      conflict: row.ideal.conflict,
      novelty: row.ideal.novelty,
    },
  };
}

function reportPromptForRow(row: CelebrityRow) {
  const star = mapCelebrity(row);
  return row.report_prompt?.trim() || row.ideal?._reportPrompt?.trim() || createDefaultCelebrityReportPrompt(star);
}

// ── 明星目录:列表页专用轻量查询 + 5 分钟公共缓存 ─────────────────────────
// 只取卡片所需字段,不含描述/报告提示词等详情内容;缓存只放已发布的公共数据。

export type StarListItem = {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  birthDate: string;
  birthTime: string;
  gender: "male" | "female" | "other" | "unknown";
  mbti: string;
  categories: string[];
  portraitSrc: string;
  createdAt: string;
  homepageFeatured: boolean;
};

type ListRow = {
  id: string;
  name: string;
  name_en: string | null;
  role: string;
  birth_date: string;
  birth_time: string | null;
  gender: "male" | "female" | "other" | "unknown";
  mbti: string;
  categories: string[] | null;
  portrait_url: string;
  created_at: string;
  homepage_featured: boolean;
};

const listSelection = "id,name,name_en,role,birth_date,birth_time,gender,mbti,categories,portrait_url,created_at,homepage_featured,homepage_position";
const LIST_CACHE_TTL_MS = 5 * 60_000;
// 同区正常 <100ms;免费层节流/网络抖动时可到秒级,2s 超时过紧曾导致整列表掉到静态兜底。
const LIST_QUERY_TIMEOUT_MS = 5000;
// 查询失败兜底(静态种子名单)只缓存 15 秒,故障恢复后立即自愈回源。
const LIST_FAILURE_TTL_MS = 15_000;

// CORTIS 静态卡注入(库里暂无档案的成员走本地种子数据 + 中文名)。
// 原 SEVENTEEN 放行名单已随全员 published=true 移除,查询回归纯 published 过滤。
const RESTORED_CORTIS_IDS = new Set(["james"]);
const CORTIS_CHINESE_NAMES: Record<string, string> = {
  james: "赵雨凡",
};

function restoredCortisListItems(): StarListItem[] {
  return stars.filter((star) => RESTORED_CORTIS_IDS.has(star.id)).map((star) => ({
    id: star.id,
    name: CORTIS_CHINESE_NAMES[star.id] ?? star.name,
    nameEn: star.name,
    role: `CORTIS成员-${CORTIS_CHINESE_NAMES[star.id] ?? star.name}`,
    birthDate: star.birthDate,
    birthTime: "",
    gender: star.gender ?? "unknown",
    mbti: star.mbti ?? "",
    categories: star.categories ?? ["CORTIS"],
    portraitSrc: star.portraitSrc,
    createdAt: star.createdAt ?? "",
    homepageFeatured: true,
  }));
}

function withRestoredCortis(items: StarListItem[]): StarListItem[] {
  const present = new Set(items.map((item) => item.id));
  return [...restoredCortisListItems().filter((item) => !present.has(item.id)), ...items];
}

function seedStarList(): StarListItem[] {
  // 查询超时/网关限流时退回全量快照(76 人,scripts/gen-star-snapshot.mjs 导出),
  // 用户看到完整列表(最多旧几分钟)而不是残缺名单;failureTtl 短保真,恢复后即回源。
  return STAR_SNAPSHOT.map((item) => ({ ...item }));
}

// 公开人物列表:同实例缓存 + 并发去重 + 5s 查询超时;失败时优先返回最近一次成功数据,
// 再退种子名单;兜底值仅缓存 15s(LIST_FAILURE_TTL_MS),避免弱名单长期顶替真实列表。
const starListCache = createServerCache<StarListItem[]>({
  name: "celebrity_profiles.published_list",
  ttlMs: LIST_CACHE_TTL_MS,
  timeoutMs: LIST_QUERY_TIMEOUT_MS,
  failureTtlMs: LIST_FAILURE_TTL_MS,
  load: async () => {
    if (!hasCloudConfig()) return seedStarList();
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(listSelection)
      .eq("published", true)
      .order("workspace_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return withRestoredCortis(((data ?? []) as unknown as ListRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      nameEn: row.name_en ?? "",
      role: row.role,
      birthDate: row.birth_date,
      birthTime: row.birth_time ?? "",
      gender: row.gender ?? "unknown",
      mbti: row.mbti,
      categories: row.categories ?? [],
      portraitSrc: row.portrait_url,
      createdAt: row.created_at,
      homepageFeatured: Boolean(row.homepage_featured),
    })));
  },
  onError: (_error, stale) => stale ?? seedStarList(),
});

export async function getPublishedStarList(): Promise<StarListItem[]> {
  return starListCache.get();
}

export async function getHomepageStarList(): Promise<StarListItem[]> {
  const items = await getPublishedStarList();
  return items.filter((item) => item.homepageFeatured).slice(0, 6);
}

export async function getPublishedStars(): Promise<StarProfile[]> {
  if (!hasCloudConfig()) return stars;
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(profileSelection)
      .eq("published", true)
      .order("workspace_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as unknown as CelebrityRow[]).map(mapCelebrity);
  } catch (error) {
    console.error("Failed to read published celebrity profiles", error);
    return stars;
  }
}

export async function getHomepageStars(): Promise<StarProfile[]> {
  if (!hasCloudConfig()) return stars;
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(profileSelection)
      .eq("published", true)
      .eq("homepage_featured", true)
      .order("homepage_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as unknown as CelebrityRow[]).map(mapCelebrity);
  } catch (error) {
    console.error("Failed to read homepage celebrity profiles", error);
    return stars;
  }
}

export async function getPublishedStar(id: string): Promise<StarProfile | undefined> {
  if (!hasCloudConfig()) return getStar(id);
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(profileSelection)
      .eq("id", id)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCelebrity(data as unknown as CelebrityRow) : RESTORED_CORTIS_IDS.has(id) ? getStar(id) : undefined;
  } catch (error) {
    console.error("Failed to read celebrity profile", error);
    return getStar(id);
  }
}

export async function getCelebrityReportPrompt(id: string): Promise<string | undefined> {  if (!hasCloudConfig()) {
    const star = getStar(id);
    return star ? star.reportPrompt?.trim() || createDefaultCelebrityReportPrompt(star) : undefined;
  }
  noStore();
  try {
    const { data, error } = await createSupabaseAdminClient()
      .from("celebrity_profiles")
      .select(reportSelection)
      .eq("id", id)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    return data ? reportPromptForRow(data as unknown as CelebrityRow) : undefined;
  } catch (error) {
    console.error("Failed to read celebrity report prompt", error);
    const star = getStar(id);
    return star ? star.reportPrompt?.trim() || createDefaultCelebrityReportPrompt(star) : undefined;
  }
}

const vedicSelection = "id,name,birth_date,birth_time,birth_place,birth_lat,birth_lon,birth_tz,gender";

export async function getCelebrityVedicBirth(id: string): Promise<CelebrityVedicBirth | undefined> {
  noStore();
  const { data, error } = await createSupabaseAdminClient()
    .from("celebrity_profiles")
    .select(vedicSelection)
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const row = data as CelebrityRow;
  if (!row.birth_time || row.birth_lat == null || row.birth_lon == null || !row.birth_tz) return undefined;
  return {
    starId: row.id,
    name: row.name,
    birthDate: row.birth_date,
    birthTime: row.birth_time,
    birthPlace: row.birth_place ?? "",
    lat: row.birth_lat,
    lon: row.birth_lon,
    tz: row.birth_tz,
    gender: row.gender ?? "unknown",
  };
}

// 详情页八字文案:标题下的一句命理印象 + 按钮上方的梗概,按出生资料实时排盘生成。
export async function getStarBaziBrief(id: string): Promise<{ headline: string; brief: string }> {
  try {
    const birth = await getCelebrityVedicBirth(id);
    if (!birth) return { headline: "", brief: "" };
    const chart = buildBaziChart({
      birthDate: birth.birthDate,
      birthTime: birth.birthTime,
      gender: birth.gender === "female" ? "female" : "male",
      city: { id: birth.starId, name: birth.birthPlace || "首尔 · 韩国", lat: birth.lat, lon: birth.lon, tz: birth.tz },
    });
    return { headline: buildStarBaziHeadline(chart), brief: buildStarBaziBrief(chart) };
  } catch (error) {
    console.error("Failed to build star bazi brief", error);
    return { headline: "", brief: "" };
  }
}

// 是否已解锁过该明星的报告(付费模式下重看免费)。
export async function hasStarReportView(userId: string, starId: string): Promise<boolean> {
  try {
    const { data } = await createSupabaseAdminClient()
      .from("star_report_views")
      .select("star_id")
      .eq("user_id", userId)
      .eq("star_id", starId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

// 详情页徽标:该明星已解锁的报告类型(重看免费提示用)。
export async function getStarReportViewTypes(userId: string, starId: string): Promise<Array<"bazi" | "astrology">> {
  try {
    const { data } = await createSupabaseAdminClient()
      .from("star_report_views")
      .select("report_type")
      .eq("user_id", userId)
      .eq("star_id", starId);
    return (data ?? [])
      .map((row) => row.report_type)
      .filter((type): type is "bazi" | "astrology" => type === "bazi" || type === "astrology");
  } catch {
    return [];
  }
}

// 浏览记录:报告页真正打开后原子计数(按报告类型区分)。
export type StarReportType = "bazi" | "astrology";

export async function recordStarReportView(userId: string, starId: string, reportType: StarReportType = "bazi") {
  try {
    await createSupabaseAdminClient().rpc("record_star_report_view", { p_user_id: userId, p_star_id: starId, p_report_type: reportType });
  } catch (error) {
    console.error("Failed to record star report view", error);
  }
}

export type StarReportView = {
  starId: string;
  name: string;
  role: string;
  portraitSrc: string;
  reportType: StarReportType;
  askCount: number;
  viewCount: number;
  lastViewedAt: string;
};

export async function getStarReportViews(userId: string): Promise<StarReportView[]> {
  noStore();
  try {
    // 两步查询:views 与 conversations 无外键,不能嵌套 join,代码内按(明星,类型)合并
    const [viewsResult, askResult] = await Promise.all([
      createSupabaseAdminClient()
        .from("star_report_views")
        .select("star_id, report_type, view_count, last_viewed_at, celebrity_profiles!inner(name, role, portrait_url, published)")
        .eq("user_id", userId)
        .eq("report_type", "bazi")
        .order("last_viewed_at", { ascending: false })
        .limit(120),
      createSupabaseAdminClient()
        .from("ask_conversations")
        .select("star_id, report_type, message_count")
        .eq("user_id", userId),
    ]);
    const { data, error } = viewsResult;
    if (error) throw error;
    const askCounts = new Map<string, number>();
    for (const row of (askResult.data ?? []) as unknown as Array<{ star_id: string; report_type: string; message_count: number }>) {
      askCounts.set(`${row.star_id}|${row.report_type}`, Math.floor(row.message_count / 2));
    }
    if (error) throw error;
    return ((data ?? []) as unknown as Array<{
      star_id: string;
      report_type: StarReportType;
      view_count: number;
      last_viewed_at: string;
      celebrity_profiles: { name: string; role: string; portrait_url: string; published: boolean } | null;
    }>)
      .filter((row) => row.celebrity_profiles?.published)
      .map((row) => ({
        starId: row.star_id,
        name: row.celebrity_profiles!.name,
        role: row.celebrity_profiles!.role,
        portraitSrc: row.celebrity_profiles!.portrait_url,
        reportType: row.report_type === "astrology" ? "astrology" : "bazi",
        askCount: askCounts.get(`${row.star_id}|${row.report_type}`) ?? 0,
        viewCount: row.view_count,
        lastViewedAt: row.last_viewed_at,
      }));
  } catch (error) {
    console.error("Failed to read star report views", error);
    return [];
  }
}

export async function incrementStarMatchCount(id: string) {
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("celebrity_profiles").select("match_count").eq("id", id).maybeSingle();
  if (error || !data) return;
  await client
    .from("celebrity_profiles")
    .update({ match_count: ((data as { match_count: number }).match_count ?? 0) + 1 })
    .eq("id", id);
}
