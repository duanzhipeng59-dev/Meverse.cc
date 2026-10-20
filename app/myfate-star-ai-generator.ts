// 单人生辰画像报告的 AI 生成管线(与双人合盘同体系):
// 事实由八字引擎确定性计算(四柱/十神/格局/神煞/大运流年打分),文案由 AI 按结构化 JSON 输出,
// zod 校验后与事实骨架合并成 ConsultOverrideContent,入库 consult_overrides,报告页渲染层零改动。
// 原则:AI 只写文案字段;年份/干支/分数/标签等结构字段一律以引擎为准,不进 schema、不可被改。
import { z } from "zod";
import type { BaziChart } from "./myfate-bazi-engine";
import type { BaziLifeProfile } from "./myfate-bazi-profile";
import type { ConsultOverrideContent } from "./myfate-consult-override-store";

export const STAR_REPORT_SYSTEM_PROMPT = `你是 MeVerse 的生辰画像报告作者,基于子平八字体系为一位公众人物撰写命理解读报告。

严格遵守以下规则:
1. 只依据输入 JSON 中的命盘事实(四柱、十神、格局、神煞、大运、流年、喜忌)进行解读,不得虚构或引用任何现实信息——学历、出道、作品、奖项、恋情、家庭现实一律不得出现。
2. 所有年份、干支、分数、大运区间以输入为准,原样保留在对应位置,不得增删改或自行推算新年份。
3. 解读必须落到具体命理结构(某柱某干支、某十神强弱、某神煞、某步大运),说清「这个结构如何推导出这个判断」;禁止脱离结构的老生常谈。
4. 语气:有网感、具体、有画面,克制使用比喻;不堆砌术语,每个术语出现时都用白话落地一次。
5. 只做趋势与风格表达(更适合/更值得关注/压力可能增加),不预测具体现实事件,不给出医疗、法律、投资指令;财富区间只是结构估算的表达。
6. 全文以「TA」称呼本人;不提及大模型、Prompt、算法、评分机制或生成过程。
7. 输出必须是一个 JSON 对象,不要输出 Markdown、代码块或 JSON 以外的任何文字。
8. lifetimeNotes 与 yearsNotes 的每条 note 必须与输入中同干支/同年份的那条事实对应,逐条给出,一条不漏。
9. 输出 JSON 的精确结构(字段名一个不能少、不能多;括号内为要求):
{
  "portrait": {
    "strength": { "content": "(40-90字,身强弱+五行喜忌的画像总述)", "highlights": ["(2-4个短标签)"] },
    "dao": { "content": "(40-90字,核心道法/人生算法)", "highlights": ["(1-2个)"] },
    "favorable": { "label": "喜神", "content": "(40-80字,喜用五行如何借力)" },
    "unfavorable": { "label": "忌神", "content": "(40-80字,忌神五行如何设界)" },
    "neutral": { "label": "闲神", "content": "(30-60字,闲神的处理态度;输入 neutral 为空数组时也要给通用表述)" },
    "shenSha": [ { "label": "(神煞名,如 贵人)", "content": "(40-70字,该神煞的解读)" }, ...输入 structures 里出现的神煞每个一条,2-4 条 ] },
    "temperament": [ { "content": "(40-80字,外在表现)", "highlights": [] }, { "content": "(40-80字,内在动力)", "highlights": [] }, { "content": "(40-80字,压力反应)", "highlights": [] } ]
  },
  "pattern": {
    "monthGridRich": { "content": "(40-90字,月令与格局的判断)", "highlights": ["(1-2个)"] },
    "structures": [ { "text": "(40-80字,对输入 relations 第1条的具体解读)" }, { "text": "(同上,第2条;输入只有1条时也只输出1个)" } ]
  },
  "education": { "degree": "(30-60字,印星强弱推出的学业画像)", "majors": ["(2-5个适合的专业方向)"] },
  "career": {
    "direction": "(40-90字,事业主赛道,由十神格局推导)",
    "management": "(30-60字,适合的管理幅度与风格)",
    "guiren": "(30-60字,贵人来自哪里)",
    "xiaoren": "(30-60字,需要防的人际形态)",
    "boss": "(30-60字,与上级的相处模式)",
    "lifetimeNotes": [ { "ganzhi": "(输入 dayun 各条的 ganzhi 原样)", "note": "(40-70字,这步大运的事业主题解读)" }, ...dayun 每步一条 ] },
    "yearsActions": [ { "year": 输入 annual 各条的 year, "note": "(30-60字,该流年事业动作建议)" }, ...annual 每年一条 ] }
  },
  "wealth": {
    "rangeRich": { "content": "(40-80字,围绕输入 wealthRange 的量级解读,数字原样引用)", "highlights": ["(输入 wealthRange 原样)"] },
    "reason": "(40-80字,量级的命理依据)",
    "source": "(30-60字,正财/偏财型与合伙注意)",
    "lifetimeNotes": [ { "ganzhi": 同上原样, "note": "(30-60字,该大运财富策略)" }, ...每步一条 ],
    "yearsNotes": [ { "year": 同上原样, "note": "(30-60字,该流年财务提示)" }, ...每年一条 ]
  },
  "love": {
    "spouse": [ { "label": "(如 长相/气质)", "text": "(30-70字,配偶画像,由配偶星推导)" }, ...3-5 条,标签自定如 长相/气质、性格、个人能力、能否旺TA、另一半职业方向 ],
    "family": "(30-60字,与对方家庭的相处)",
    "stability": "(30-60字,关系稳定度与经营要点)",
    "lifetimeNotes": [ { "ganzhi": 原样, "note": "(30-60字,该大运婚恋主题,结合输入 loveDayunTags 的 tag)" }, ...每步一条 ],
    "yearsNotes": [ { "year": 原样, "note": "(30-60字,该流年感情提示,结合 loveYearScores 的 prob/warn)" }, ...每年一条 ]
  },
  "health": { "acute": "(30-60字,结合输入 weakOrgans 与冲位的防护提示)", "mental": "(40-80字,内耗模式与解法)" },
  "children": { "fate": "(30-60字,子女缘)", "gender": "(30-60字,倾向参考,注明仅供娱乐)", "relation": "(30-60字,与时柱/晚辈的关系)" },
  "family": { "father": "(30-60字,与父亲的模式,由偏财推导)", "mother": "(30-60字,与母亲的模式,由印星推导)", "siblings": "(30-60字,同辈关系,由比劫推导)" }
}`;

const richParagraph = z.object({ content: z.string().min(20), highlights: z.array(z.string()).max(6).default([]) });
const labeledParagraph = z.object({ label: z.string().min(1).max(8), content: z.string().min(20) });
const noteItem = z.object({ ganzhi: z.string().min(2).max(2), note: z.string().min(10) });
const yearNoteItem = z.object({ year: z.number().int().min(1990).max(2100), note: z.string().min(10) });

// AI 输出契约:只有文案字段;结构事实由引擎骨架提供并在合并时以骨架为准
export const starAiContentSchema = z.object({
  portrait: z.object({
    strength: richParagraph,
    dao: richParagraph,
    favorable: labeledParagraph,
    unfavorable: labeledParagraph,
    neutral: labeledParagraph.nullish(),
    shenSha: z.array(labeledParagraph).min(2).max(6),
    temperament: z.array(richParagraph).min(2).max(4),
  }),
  pattern: z.object({
    monthGridRich: richParagraph,
    structures: z.array(z.object({ text: z.string().min(20) })).min(1).max(4),
  }),
  education: z.object({
    degree: z.string().min(10),
    majors: z.array(z.string().min(2).max(12)).min(2).max(6),
  }),
  career: z.object({
    direction: z.string().min(20),
    management: z.string().min(10),
    guiren: z.string().min(10),
    xiaoren: z.string().min(10),
    boss: z.string().min(10),
    lifetimeNotes: z.array(noteItem).min(1),
    yearsActions: z.array(yearNoteItem).min(1),
  }),
  wealth: z.object({
    rangeRich: richParagraph,
    reason: z.string().min(15),
    source: z.string().min(15),
    lifetimeNotes: z.array(noteItem).min(1),
    yearsNotes: z.array(yearNoteItem).min(1),
  }),
  love: z.object({
    spouse: z.array(z.object({ label: z.string().min(2).max(8), text: z.string().min(10) })).min(3).max(6),
    family: z.string().min(10),
    stability: z.string().min(10),
    lifetimeNotes: z.array(noteItem).min(1),
    yearsNotes: z.array(yearNoteItem).min(1),
  }),
  health: z.object({
    acute: z.string().min(10),
    mental: z.string().min(15),
  }),
  children: z.object({
    fate: z.string().min(10),
    gender: z.string().min(10),
    relation: z.string().min(10),
  }),
  family: z.object({
    father: z.string().min(10),
    mother: z.string().min(10),
    siblings: z.string().min(10),
  }),
});

export type StarAiContent = z.infer<typeof starAiContentSchema>;

const GAN_EL: Record<string, string> = { 甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水" };
const ORGAN: Record<string, string> = { 木: "肝胆", 火: "心脑血管", 土: "脾胃", 金: "呼吸系统", 水: "肾与泌尿" };
const wealthTrendOf = (score: number) => (score >= 78 ? "强劲 ↑↑" : score >= 68 ? "向好 ↑" : score >= 55 ? "平稳 →" : "承压 ↓");
const loveTagOf = (score: number) => (score >= 75 ? "婚恋窗口" : score < 55 ? "动荡期" : "平稳期");

// 引擎事实包:prompt 的唯一事实来源,也是合并时的结构骨架
export function buildStarFacts(input: {
  name: string;
  role: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  chart: BaziChart;
  profile: BaziLifeProfile;
  wealthRange: string;
}) {
  const { chart, profile } = input;
  const dayMaster = chart.dayMaster;
  const dayEl = GAN_EL[dayMaster] ?? "土";
  const ranked = profile.tenGods;
  const topGod = ranked[0].name;
  const favorable = profile.summary.favorable;
  const cautious = profile.summary.cautious;
  const all = ["木", "火", "土", "金", "水"] as const;
  const neutralEls = all.filter((el) => !favorable.includes(el) && !cautious.includes(el));
  const monthZhi = chart.pillars[1].ganzhi[1];

  const dayunScored = profile.dayun.map((step) => {
    const base = step.tone === "good" ? 78 : step.tone === "caution" ? 50 : 64;
    const jitter = (step.ganzhi.charCodeAt(0) + step.ganzhi.charCodeAt(1)) % 9;
    return { ...step, score: Math.min(90, Math.max(42, base + jitter - 4)) };
  });
  const annual = profile.annual.slice(0, 6);

  return {
    meta: { name: input.name, role: input.role, gender: input.gender, birth: `${input.birthDate} ${input.birthTime} ${input.birthPlace}` },
    chart: {
      pillars: chart.pillars.map((pillar) => ({ label: pillar.label, ganzhi: pillar.ganzhi, shiShenGan: pillar.shiShenGan, hideGan: pillar.hideGan })),
      dayMaster: `${dayMaster}${dayEl}`,
      wuXing: chart.wuXing,
      monthZhi,
    },
    structure: {
      strength: profile.summary.strength,
      favorable,
      cautious,
      neutral: neutralEls,
      tenGodsRanked: ranked.map((god) => ({ name: god.name, value: god.value, keywords: god.keywords })),
      topPattern: topGod,
      relations: profile.relations.slice(0, 4),
    },
    dayun: dayunScored.map((step) => ({ ganzhi: step.ganzhi, age: step.ageText, years: step.yearText, score: step.score, tone: step.tone, theme: step.theme, current: step.current })),
    annual: annual.map((year) => ({ year: year.year, ganzhi: year.ganzhi, score: year.score, focus: year.focus, opportunity: year.opportunity, watch: year.watch })),
    derived: {
      wealthRange: input.wealthRange,
      weakOrgans: [...all.filter((el) => el !== dayEl)].sort((a, b) => (chart.wuXing[a] ?? 0) - (chart.wuXing[b] ?? 0)).slice(0, 2).map((el) => `${el}(${ORGAN[el]})`),
      loveDayunTags: dayunScored.map((step) => ({ ganzhi: step.ganzhi, age: step.ageText, tag: loveTagOf(step.score) })),
      loveYearScores: annual.map((year) => ({ year: year.year, ganzhi: year.ganzhi, prob: year.score >= 70 ? 65 : year.score >= 55 ? 50 : 40, warn: year.score < 45 })),
    },
  };
}

export type StarFacts = ReturnType<typeof buildStarFacts>;

export function buildStarReportPrompt(facts: StarFacts) {
  return `请根据以下命盘事实 JSON,输出这位人物的完整生辰画像文案 JSON(结构与字段名严格按系统指令中的输出说明)。
事实 JSON 是唯一事实来源:其中的年份、干支、分数、大运区间在输出对应位置原样使用,不得改动或新增。
lifetimeNotes 对应 dayun 的每条大运(按 ganzhi 对齐);yearsActions 对应 career(annual),yearsNotes 对应 wealth 与 love(annual 同一份)。

${JSON.stringify(facts, null, 1)}`;
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("NO_JSON");
  return text.slice(start, end + 1);
}

export async function generateStarContent(
  callModel: (system: string, prompt: string) => Promise<string>,
  facts: StarFacts,
): Promise<StarAiContent> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const text = await callModel(STAR_REPORT_SYSTEM_PROMPT, buildStarReportPrompt(facts));
    try {
      return starAiContentSchema.parse(JSON.parse(extractJson(text)));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("STAR_AI_INVALID");
}

// 事实骨架 + AI 文案 → 可入库的完整报告结构;结构字段一律取骨架值
export function mergeStarAiContent(facts: StarFacts, ai: StarAiContent): ConsultOverrideContent {
  const byGanzhi = (notes: Array<{ ganzhi: string; note: string }>, ganzhi: string) => notes.find((item) => item.ganzhi === ganzhi)?.note ?? "";
  const byYear = (notes: Array<{ year: number; note: string }>, year: number) => notes.find((item) => item.year === year)?.note ?? "";

  return {
    heroPillars: facts.chart.pillars.map((pillar) => pillar.ganzhi),
    heroBadges: [facts.chart.dayMaster, facts.structure.strength, `喜用 ${facts.structure.favorable.join(" · ")}`],
    portrait: {
      strength: ai.portrait.strength,
      dao: ai.portrait.dao,
      favorable: { ...ai.portrait.favorable, label: "喜神" },
      unfavorable: { ...ai.portrait.unfavorable, label: "忌神" },
      neutral: ai.portrait.neutral ? { ...ai.portrait.neutral, label: "闲神" } : null,
      shenSha: ai.portrait.shenSha,
      temperament: ai.portrait.temperament,
    },
    pattern: {
      monthGrid: `${facts.chart.monthZhi}月令,${facts.structure.topPattern}格局`,
      monthGridRich: ai.pattern.monthGridRich,
      structures: facts.structure.relations.slice(0, ai.pattern.structures.length).map((rel, index) => ({ rel: rel.title, text: ai.pattern.structures[index]?.text ?? rel.text })),
    },
    education: {
      degree: ai.education.degree,
      majors: ai.education.majors,
      examGood: facts.annual.filter((year) => year.focus === "印星").slice(0, 3).map((year) => year.year),
      examBad: facts.annual.filter((year) => year.focus === "食伤" && year.score < 55).slice(0, 2).map((year) => year.year),
    },
    career: {
      direction: ai.career.direction,
      management: ai.career.management,
      guiren: ai.career.guiren,
      xiaoren: ai.career.xiaoren,
      boss: ai.career.boss,
      lifetime: facts.dayun.map((step) => ({ ganzhi: step.ganzhi, age: step.age, years: step.years, score: step.score, note: byGanzhi(ai.career.lifetimeNotes, step.ganzhi), current: step.current })),
      years: facts.annual.map((year) => ({ year: year.year, ganzhi: year.ganzhi, score: year.score, tag: year.score >= 70 ? "升迁发力年" : year.score >= 50 ? "稳步积累期" : year.score >= 40 ? "调整再定位" : "守住基本盘", action: byYear(ai.career.yearsActions, year.year) })),
    },
    wealth: {
      disclaimer: "以下为纯天赋计算值,未考虑地域/家庭/社会等因素影响,仅供参考。",
      range: facts.derived.wealthRange,
      rangeRich: ai.wealth.rangeRich,
      reason: ai.wealth.reason,
      source: ai.wealth.source,
      lifetime: facts.dayun.map((step) => ({ ganzhi: step.ganzhi, age: step.age, trend: wealthTrendOf(step.score), note: byGanzhi(ai.wealth.lifetimeNotes, step.ganzhi) })),
      years: facts.annual.map((year) => ({ year: year.year, ganzhi: year.ganzhi, score: year.score, tag: year.score >= 70 ? "扩张窗口·可加码" : year.score >= 50 ? "稳健进账·守节奏" : year.score >= 40 ? "现金为王·防套牢" : "收缩防御·忌杠杆", note: byYear(ai.wealth.yearsNotes, year.year) })),
    },
    love: {
      spouse: ai.love.spouse,
      family: ai.love.family,
      stability: ai.love.stability,
      lifetime: facts.derived.loveDayunTags.map((step) => ({ ganzhi: step.ganzhi, age: step.age, tag: step.tag, note: byGanzhi(ai.love.lifetimeNotes, step.ganzhi) })),
      years: facts.derived.loveYearScores.map((year) => ({ year: year.year, ganzhi: year.ganzhi, prob: year.prob, warn: year.warn, note: byYear(ai.love.yearsNotes, year.year) })),
    },
    health: {
      organs: facts.derived.weakOrgans.map((item) => item.replace(/[()（）].*$/, "")),
      acute: ai.health.acute,
      mental: ai.health.mental,
    },
    children: ai.children,
    family: ai.family,
  };
}
