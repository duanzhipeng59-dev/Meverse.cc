// 单人生辰画像 AI 生成脚本(管理动作,不按用户扣费):
// 排盘取事实 → DeepSeek 写文案 → zod 校验(2 轮) → 合并结构骨架 → upsert consult_overrides。
// 渲染层零改动:报告页仍从 consult_overrides 读,没有的明星继续显示「报告准备中」。
// 用法: npx tsx --env-file=.env.local scripts/gen-star-report-ai.ts --star=rm [--dry] [--force]
//       npx tsx --env-file=.env.local scripts/gen-star-report-ai.ts --all [--dry]   # 批量,只补没有 override 的
import { createClient } from "@supabase/supabase-js";
import { buildBaziChart } from "../app/myfate-bazi-engine";
import { buildBaziLifeProfile } from "../app/myfate-bazi-profile";
import { generateChatText } from "../app/api/myfate/personalize/model-provider";
import { buildStarFacts, generateStarContent, mergeStarAiContent } from "../app/myfate-star-ai-generator";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const force = args.includes("--force");
const starArg = args.find((a) => a.startsWith("--star="))?.slice(7);
const all = args.includes("--all");
if (!starArg && !all) throw new Error("用法: gen-star-report-ai.ts --star=<id> | --all [--dry] [--force]");

if (!process.env.DEEPSEEK_API_KEY) throw new Error("缺少 DEEPSEEK_API_KEY");
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("缺少 SUPABASE_URL / SUPABASE_SECRET_KEY");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

type Row = {
  id: string; name: string; role: string; gender: string | null;
  birth_date: string; birth_time: string | null; birth_place: string | null;
  birth_lat: number | null; birth_lon: number | null; birth_tz: string | null;
};

async function targetRows(): Promise<Row[]> {
  const { data, error } = await supabase
    .from("celebrity_profiles")
    .select("id,name,role,gender,birth_date,birth_time,birth_place,birth_lat,birth_lon,birth_tz")
    .eq("published", true)
    .order("workspace_position", { ascending: true, nullsFirst: false });
  if (error) throw error;
  let rows = (data ?? []) as Row[];
  if (starArg) {
    rows = rows.filter((row) => row.id === starArg);
    if (!rows.length) throw new Error(`找不到已发布的明星: ${starArg}`);
  }
  // 出生资料不完整(缺时辰/坐标)无法排盘,跳过并列出
  const usable = rows.filter((row) => row.birth_time && row.birth_lat != null && row.birth_lon != null && row.birth_tz);
  const skipped = rows.length - usable.length;
  if (skipped > 0) console.log(`跳过 ${skipped} 位出生资料不完整的明星`);
  return usable;
}

async function hasOverride(starId: string): Promise<boolean> {
  const { data } = await supabase.from("consult_overrides").select("star_id").eq("star_id", starId).maybeSingle();
  return Boolean(data);
}

function wealthRangeOf(profile: ReturnType<typeof buildBaziLifeProfile>): string {
  const wealthGod = profile.tenGods.find((god) => god.name === "财星")?.value ?? 0;
  const strong = profile.summary.strength === "身强";
  if (strong && wealthGod >= 2) return "5000万–1.2亿";
  if (strong && wealthGod >= 1.5) return "3000万–7000万";
  if (strong) return "1500万–4000万";
  if (profile.summary.strength === "中和" && wealthGod >= 1.5) return "1000万–3000万";
  if (wealthGod >= 2.5) return "800万–2000万(须借势:搭平台与合伙人才能兑现)";
  return "600万–1500万";
}

async function runOne(row: Row): Promise<"ok" | "skip"> {
  if (!force && (await hasOverride(row.id))) {
    console.log(`= ${row.id} ${row.name}: 已有 override,跳过(--force 覆盖)`);
    return "skip";
  }
  const chart = buildBaziChart({
    birthDate: row.birth_date,
    birthTime: row.birth_time ?? "12:00",
    gender: row.gender === "female" ? "female" : "male",
    city: { id: row.id, name: row.birth_place ?? "", lat: row.birth_lat ?? 0, lon: row.birth_lon ?? 0, tz: row.birth_tz ?? "Asia/Seoul" },
  });
  const profile = buildBaziLifeProfile(chart);
  const facts = buildStarFacts({
    name: row.name,
    role: row.role,
    gender: row.gender === "female" ? "女" : "男",
    birthDate: row.birth_date,
    birthTime: row.birth_time ?? "",
    birthPlace: row.birth_place ?? "",
    chart,
    profile,
    wealthRange: wealthRangeOf(profile),
  });

  const ai = await generateStarContent(
    async (system, prompt) => (await generateChatText(system, [{ role: "user", content: prompt }], { temperature: 0.7, maxTokens: 12000 })).content,
    facts,
  );
  const content = mergeStarAiContent(facts, ai);

  if (dry) {
    console.log(`= ${row.id} ${row.name} [dry] 四柱 ${content.heroPillars?.join(" ")} | 徽章 ${content.heroBadges?.join("/")}`);
    console.log(`  画像: ${content.portrait.strength.content.slice(0, 80)}…`);
    console.log(`  大运 ${content.career.lifetime.length} 步, 流年 ${content.career.years.length} 条; 文案示例: ${content.career.lifetime[0]?.note.slice(0, 60)}…`);
    return "ok";
  }
  const { error } = await supabase.from("consult_overrides").upsert(
    { star_id: row.id, content, updated_at: new Date().toISOString() },
    { onConflict: "star_id" },
  );
  if (error) throw error;
  console.log(`= ${row.id} ${row.name}: 已入库`);
  return "ok";
}

(async () => {
  const rows = await targetRows();
  console.log(`目标 ${rows.length} 位${dry ? "(dry)" : ""}`);
  let ok = 0;
  let skip = 0;
  let fail = 0;
  for (const row of rows) {
    try {
      const result = await runOne(row);
      if (result === "ok") ok += 1;
      else skip += 1;
    } catch (error) {
      fail += 1;
      console.error(`✗ ${row.id} ${row.name}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`完成: 成功 ${ok} / 跳过 ${skip} / 失败 ${fail}`);
})();
