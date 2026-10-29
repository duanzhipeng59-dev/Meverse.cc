// 双人合盘报告生成管线(与个人解读同构):引擎确定性排盘(双方各自+跨盘关系事实)→
// 蒸馏模版 → 模型单次直出 → strict 校验 + 表达层机器校验 → 违规喂回重试。
// 事实口径与个人链路一致:引擎只给事实(旺衰/喜忌/合冲刑害/大运流年),命理结论由模版引导模型表达。
import { z } from "zod";
import { buildBaziChart, GAN_WUXING, ZHI_WUXING } from "./myfate-bazi-engine";
import { buildBaziLifeProfile, LIU_HE, CHONG, HAI, GAN_HE, ZHI_XING, type BaziLifeProfile } from "./myfate-bazi-profile";
import { vedicCities } from "./myfate-cities";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import type { ReadingSubject } from "./myfate-reading-server";
import { generateValidatedReport, buildShenShaFacts, BANNED_STYLE_WORDS } from "./myfate-static-reading";

// ── 输出契约:九章 23 字段,sections/insights 形状与个人报告同构(渲染/追问/分享全兼容) ──
const dualInsightSchema = z.object({ label: z.string(), content: z.string() }).strict();
const dualSectionSchema = z.object({ title: z.string(), insights: z.array(dualInsightSchema).min(1) }).strict();
const dualSectionKeys = ["overview", "profiles", "attraction", "dynamics", "friction", "intimacy", "collaboration", "family", "rhythm"] as const;
export const dualReadingSchema = z.object({
  schemaVersion: z.literal("dual-reading-v1"),
  sections: z.object(Object.fromEntries(dualSectionKeys.map((key) => [key, dualSectionSchema])) as Record<(typeof dualSectionKeys)[number], typeof dualSectionSchema>).strict(),
}).strict();
export type DualReading = z.infer<typeof dualReadingSchema>;

export const DUAL_READING_SYSTEM_PROMPT = `你是精通传统子平八字与现代亲密关系心理的资深合婚分析师。你的任务不是重新创作命理文章，而是根据八字引擎提供的确定性排盘数据（双方各自命盘+跨盘关系事实），按九章23字段蒸馏模板生成专业、具体、有针对性的《MeVerse 双人合盘报告》——像经验丰富的命理师当面解读这对关系。
写作规则：
1. 先下结论，再讲盘面依据，最后落到现实的关系特征、相处模式或发展方向；结论直接、有判断力。
2. 专业术语必须翻译成关系画像：不解释五行十神的定义，写清"这意味着你们俩怎样相处"。
3. 全程用双方姓名称呼（不用"你/你们/TA"），结论先行，术语后紧跟白话。
4. 双方各自命盘的旺衰、喜忌、十神、神煞一律以排盘给定为准，不得自行改判；跨盘合冲刑害只解读【关系事实】里给出的条目，不得补造。
5. 内容具体，杜绝"需要多沟通""互相包容"式空话；每条判断写清盘面依据和现实表现。
6. 优势与短板并存：合盘不捧不吓，摩擦点必须配化解处方。
7. 不写"注定离婚""必然分手""克夫克妻"等宿命论断言；未来节奏只依据提供的流年排盘，年份不编造。
8. 不用"注定""必然"等绝对化措辞；命理解读保持传统文化解释属性。
输出必须是单个 JSON 对象，不要 Markdown，字段结构匹配给定模板。`;

const DUAL_TEMPLATE_SECTIONS = `【报告模版】九章固定为 overview、profiles、attraction、dynamics、friction、intimacy、collaboration、family、rhythm，共 23 个字段，各章 insights 按下列字段顺序组织（label 用字段名，不增不减不改序；双方底色两条 label 分别写「{A姓名}的底色」「{B姓名}的底色」；短句直断，每字段1-3句；正文不用 Markdown 星号，标签一律用「」）：

01 overview 合盘总览（3字段）：匹配定调（开头一句总评+定性等级（如"中上等合婚""互补大于消耗"），引用最关键的1-2条盘面依据）；关系关键词（一行式：3-4个关键词，逗号分隔，如"土水相济、慢热深耕、财务互补"）；互补与消耗（A补B什么、B补A什么各一句，最大的消耗点一句，结论先行）。
02 profiles 双方底色（2字段）：「{A姓名}的底色」（旺衰+道法+喜忌两行式：旺衰定性一句、喜神忌神各一行，与个人报告口径一致）；「{B姓名}的底色」（同上）。
03 attraction 吸引来源（3字段）：五行吸引（双方日主的五行生克方向（谁生谁/比和/谁克谁，按【关系事实】给定的日主关系），落到"这种组合为什么容易互相看对眼"）；十神互见（A看B是什么十神印象、B看A是什么十神印象，按给定事实，写双方在彼此眼里的初始滤镜）；初识磁场（初识阶段最容易互相吸引的1-2个点+需要警惕的错位）。
04 dynamics 相处模式（3字段）：日常相处（谁主动谁接收、节奏谁快谁慢，基于双方旺衰与主导十神）；沟通风格（两人的表达/吸收模式差异与合拍点）；付出与回应（付出方向是否对频，A习惯给的 vs B想要收的）。
05 friction 摩擦与化解（3字段）：主要摩擦点（逐条引用【关系事实】给出的跨盘刑冲合害：是什么、落在哪对柱位、在关系里表现为什么，没有跨盘刑冲时写"结构平稳"并指出最需主动经营的点）；触发雷区（最容易被点燃的1-2个场景）；化解处方（针对每个摩擦点的具体做法，不写空话）。
06 intimacy 亲密与责任（2字段）：夫妻宫互看（双方日支的十神与互关系（按给定事实），落到亲密里的真实体验）；亲密与责任（关系里的责任分配倾向、谁更需要被托底）。
07 collaboration 事业财富协作（3字段）：搭伙做事（一起做事/做生意的合力如何，按双方喜忌互补事实判断）；资源互补（A的资源帮B什么、B的资源帮A什么）；合作雷区（合伙/财务上的风险点，比劫旺为忌的一方必须写明财务边界）。
08 family 家庭六亲（2字段）：家庭接纳（双方家庭风格（按各自印星/比劫状态）与互相接纳度倾向）；事务分工（家务、决策、人情往来的分工倾向）。
09 rhythm 未来节奏（2字段）：关系关键年（按【双方流年】逐年对照，只挑3-6个关键年份写：双方同年喜用到位=顺势年，双方同年忌神旺或冲夫妻宫=压力年，逐年格式"YYYY年（干支）· 年度标签：对关系的影响与建议"，其余年份不写）；养护提醒（这段关系长期经营最核心的1-2条，来自盘面结构）。

【输出 JSON 结构】(sections 是以九个章节 key 为字段的对象，不是数组；不要输出模板之外的任何字段)

${JSON.stringify({ schemaVersion: "dual-reading-v1", sections: Object.fromEntries(dualSectionKeys.map((key) => [key, { title: "章节标题", insights: [{ label: "字段名", content: "完整解读段落" }] }])) }, null, 1)}`;

// ── 表达层:禁词表与个人版共用;字数上限按双人字段初标(样本校准后调整) ──
const DUAL_FIELD_CHAR_LIMITS: Record<string, number> = {
  关系关键词: 60, 匹配定调: 160, 养护提醒: 160, 事务分工: 180, 触发雷区: 180, 初识磁场: 180,
  合作雷区: 200, 资源互补: 200, 家庭接纳: 220, 五行吸引: 220, 十神互见: 220, 日常相处: 220,
  沟通风格: 220, 付出与回应: 220, 化解处方: 240, 搭伙做事: 220, 亲密与责任: 260, 夫妻宫互看: 260,
  互补与消耗: 260, 主要摩擦点: 300, 关系关键年: 700,
};
const DUAL_DEFAULT_CHAR_LIMIT = 400;

export function checkDualReadingStyle(report: DualReading): string[] {
  const violations: [] | string[] = [];
  const full = JSON.stringify(report);
  for (const word of BANNED_STYLE_WORDS) {
    if (full.includes(word)) { (violations as string[]).push(`禁词「${word}」`); break; }
  }
  for (const section of Object.values(report.sections)) {
    for (const insight of section.insights) {
      const exclaim = (insight.content.match(/！/g) ?? []).length;
      if (exclaim > 2) (violations as string[]).push(`${insight.label}感叹号${exclaim}个`);
      const limit = insight.label.endsWith("的底色") ? 300 : DUAL_FIELD_CHAR_LIMITS[insight.label] ?? DUAL_DEFAULT_CHAR_LIMIT;
      if (insight.content.length > limit) (violations as string[]).push(`${insight.label}${insight.content.length}字超限${limit}`);
      if (violations.length >= 3) return violations;
    }
  }
  return violations;
}

// ── 排盘:双方各自四柱+profile ──
function subjectToChart(subject: ReadingSubject) {
  const city = vedicCities.find((item) => item.id === subject.cityId)
    ?? { id: subject.cityId, name: subject.cityName, lat: 37.5665, lon: 126.978, tz: "Asia/Seoul" };
  const chart = buildBaziChart({ birthDate: subject.birthDate, birthTime: subject.birthTime, gender: subject.gender, city });
  return { chart, profile: buildBaziLifeProfile(chart) };
}

// ── 单人压缩事实(双盘全文太长,只保留合盘要用的确定性事实) ──
function personFacts(name: string, chart: ReturnType<typeof buildBaziChart>, profile: BaziLifeProfile) {
  const lines = [
    `姓名:${name}｜四柱:${chart.pillars.map((p) => p.ganzhi).join(" ")}｜日主${chart.dayMaster}(${GAN_WUXING[chart.dayMaster]})`,
    `旺衰:${profile.summary.strength}｜喜用:${profile.summary.favorable.join("、")}｜节制:${profile.summary.cautious.join("、")}`,
    `十神权重:${profile.tenGods.map((god) => `${god.name}${god.value}`).join("、")}`,
    `日支(夫妻宫):${chart.pillars[2].ganzhi[1]}，藏干${chart.pillars[2].hideGan.join("、")}`,
    ...buildShenShaFacts(chart).map((item) => item.fact),
  ];
  return lines;
}

// ── 跨盘关系事实:全部为表查/计数类确定性推导,只给事实不给结论 ──
function relationFacts(a: ReturnType<typeof buildBaziChart>, b: ReturnType<typeof buildBaziChart>) {
  const facts: string[] = [];
  const aDay = a.dayMaster, bDay = b.dayMaster;
  const aEl = GAN_WUXING[aDay], bEl = GAN_WUXING[bDay];
  const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
  const KE: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
  if (aEl === bEl) facts.push(`日主关系:${aDay}与${bDay}同为${aEl}，比和（同气相求，也同强同弱）`);
  else if (SHENG[aEl] === bEl) facts.push(`日主关系:${aDay}(${aEl})生${bDay}(${bEl})——A天然付出/滋养一方，B天然接收一方`);
  else if (SHENG[bEl] === aEl) facts.push(`日主关系:${bDay}(${bEl})生${aDay}(${aEl})——B天然付出/滋养一方，A天然接收一方`);
  else if (KE[aEl] === bEl) facts.push(`日主关系:${aDay}(${aEl})克${bDay}(${bEl})——A天然主导/约束一方`);
  else facts.push(`日主关系:${bDay}(${bEl})克${aDay}(${aEl})——B天然主导/约束一方`);

  const cross: string[] = [];
  const aPillars = a.pillars, bPillars = b.pillars;
  for (let i = 0; i < aPillars.length; i += 1) {
    for (let j = 0; j < bPillars.length; j += 1) {
      const pa = aPillars[i], pb = bPillars[j];
      const za = pa.ganzhi[1], zb = pb.ganzhi[1];
      const pair = (rel: string) => cross.push(`A${pa.label}${za}与B${pb.label}${zb}${rel}`);
      if (LIU_HE[za] === zb) pair("六合");
      else if (CHONG[za] === zb) pair("相冲");
      else if (HAI[za] === zb) pair("相害");
      else if (ZHI_XING.has(za + zb) || ZHI_XING.has(zb + za)) pair("相刑");
      if (GAN_HE[pa.ganzhi[0]] === pb.ganzhi[0]) cross.push(`A${pa.label}${pa.ganzhi[0]}与B${pb.label}${pb.ganzhi[0]}天干五合`);
    }
  }
  facts.push(cross.length ? `跨盘干支互动:${cross.join("；")}` : "跨盘干支互动:两盘之间没有合冲刑害，关系结构平稳，课题主要来自各自命局与运势阶段");

  const aProfile = buildBaziLifeProfile(a), bProfile = buildBaziLifeProfile(b);
  const complementary: string[] = [];
  for (const element of aProfile.summary.favorable) {
    const count = (b.wuXing[element] ?? 0);
    if (count >= 2) complementary.push(`B命中${element}${count}处，正是A的喜用，能实质补A`);
  }
  for (const element of bProfile.summary.favorable) {
    const count = (a.wuXing[element] ?? 0);
    if (count >= 2) complementary.push(`A命中${element}${count}处，正是B的喜用，能实质补B`);
  }
  for (const element of aProfile.summary.cautious) {
    const count = (b.wuXing[element] ?? 0);
    if (count >= 3) complementary.push(`B命中${element}${count}处，恰是A需节制的方向，易放大A的消耗`);
  }
  for (const element of bProfile.summary.cautious) {
    const count = (a.wuXing[element] ?? 0);
    if (count >= 3) complementary.push(`A命中${element}${count}处，恰是B需节制的方向，易放大B的消耗`);
  }
  facts.push(`五行互补对照:A五行计数${Object.entries(a.wuXing).map(([k, v]) => `${k}${v}`).join("、")}；B五行计数${Object.entries(b.wuXing).map(([k, v]) => `${k}${v}`).join("、")}。${complementary.join("；") || "双方五行没有明显的互补或对冲信号"}`);
  return facts;
}

function rhythmLines(name: string, profile: BaziLifeProfile) {
  return [
    `${name} 大运:${profile.dayun.map((step) => `${step.ganzhi}(${step.ageText}岁${step.current ? ",当前" : ""})`).join("、")}`,
    `${name} 流年:${profile.annual.map((year) => `${year.year}${year.ganzhi}(参考分${year.score})`).join("、")}`,
  ];
}

export function buildDualReadingPrompt(subjectA: ReadingSubject, subjectB: ReadingSubject) {
  const a = subjectToChart(subjectA);
  const b = subjectToChart(subjectB);
  const annual = a.profile.annual;
  const range = annual.length ? `${annual[0].year}–${annual[annual.length - 1].year}` : "";
  return `请依据下面的排盘信息，按报告模版生成完整的《MeVerse 双人合盘报告》。文中{A姓名}用「${subjectA.name}」、{B姓名}用「${subjectB.name}」。

【${subjectA.name} 排盘事实】
${personFacts(subjectA.name, a.chart, a.profile).join("\n")}

【${subjectB.name} 排盘事实】
${personFacts(subjectB.name, b.chart, b.profile).join("\n")}

【关系事实（跨盘确定性推导，合冲刑害只解读这里给出的条目）】
${relationFacts(a.chart, b.chart).join("\n")}

【双方大运流年（时间类字段以此为据，流年只覆盖 ${range}，不编造区间外年份；"关系关键年"逐年对照双方参考分择要写）】
${[...rhythmLines(subjectA.name, a.profile), ...rhythmLines(subjectB.name, b.profile)].join("\n")}

${DUAL_TEMPLATE_SECTIONS}`;
}

// 双人合盘与个人解读同通道(线上 Gemini 30k;本机无 Gemini 密钥时可用 callModel 注入 DeepSeek 预览)。
export async function generateDualReading(subjectA: ReadingSubject, subjectB: ReadingSubject, callModel?: (system: string, prompt: string) => Promise<string>): Promise<DualReading> {
  const model = callModel ?? (async (system, prompt) =>
    (await generateChatText(system, [{ role: "user", content: prompt }], { provider: "gemini", temperature: 0.35, maxTokens: 30000, json: true })).content);
  return generateValidatedReport(model, {
    system: DUAL_READING_SYSTEM_PROMPT,
    buildPrompt: (retrySuffix) => buildDualReadingPrompt(subjectA, subjectB) + retrySuffix,
    validate: (raw) => dualReadingSchema.parse(raw),
    styleCheck: checkDualReadingStyle,
  });
}
