// ── 个人报告 V3 按章并行生成管线 ────────────────────────────────────────
// 链路:命盘计算(引擎,不变) → 命理规则处理(bazi-rules,确定性) → 按章并行
// AI 生成(9 章各自注入同一份锚点与本章字段规则) → 组装 + Schema 校验 →
// 跨章一致性校验 → 违规章节定向重生成(不重写整篇)。
// 输出仍是 staticReadingSchema(single-full-v3)——前端/历史报告/追问全兼容。
// 预算:总守卫 ~240s(Vercel 300s 函数上限内留 failed+退款余量),单章超时 150s,
// 修复最多 2 轮。双人合盘不经过本管线(generateDualReading 不变)。

import {
  BANNED_STYLE_WORDS, DEFAULT_FIELD_CHAR_LIMIT,
  extractJson, parseModelJson, sectionKeys, sectionSchema, staticReadingSchema,
  type StaticReading,
} from "./myfate-static-reading";
import { checkConsistency, violationsBySection } from "./bazi-rules/consistency";
import { SECTION_TITLES, fieldSpecsOfSection, type FieldSpec, type SectionKey } from "./bazi-rules/field-specs";
import type { BaziJudgment } from "./bazi-rules/judgment";

type CallModel = (system: string, prompt: string) => Promise<string>;
type SectionDraft = { title: string; summary?: string; insights: Array<{ label: string; content: string; evidenceIds?: string[] }>; advice: string[] };

/** 单章超时(毫秒)与总预算(毫秒) */
const SECTION_CALL_TIMEOUT_MS = 150_000;
const TOTAL_BUDGET_MS = 240_000;
/** 修复轮数(初始生成后,最多再修 2 轮) */
const MAX_REPAIR_ROUNDS = 2;

// ── 系统提示词(V3):引擎负责算准,规则层负责判断,AI 只做翻译 ──────────
export const SECTION_SYSTEM_PROMPT = `你是精通传统八字命理、擅长现代人物画像的资深命理分析师。排盘引擎与命理规则层已经完成确定性计算,你的任务是把给定的命理结构与判断结论翻译成用户读得懂、有个人针对性的文字——像经验丰富的命理师当面解读,而不是解释命理知识。
写作规则:
1. 锚点原样引用:【全局命理结论】中的旺衰档位、格局名、喜用忌神五行、调候结论、财富档位均为引擎确定性判定,必须原样引用;不得改判、不得输出锚点之外的档位、格局名或五行归类。
2. 只用给定事实:四柱干支、藏干十神、合冲刑害、神煞、大运流年一律以【本章命理事实】为准;引用干支、年份、大运时只能引用其中存在的;证据不足时降低判断强度或写明依据不足,不得补造。
3. 先下结论再讲依据:每字段第一句必须是结论句;依据引用具体干支结构;最后落到现实的人物特征、行为模式或行动建议(核心结论→命理依据→现实解读→条件提醒的顺序,不必四段俱全,按字段规格取舍)。
4. 术语后紧跟白话:十神五行格局术语出现后,括号或紧跟句给出白话;转化为"这意味着你怎样"的画像,不空讲定义。
5. 全程第二人称「你」;核心结论词用中文引号「」标注(仅用于结论词,不滥用);正文不用 Markdown 星号。
6. 个性化与差异化:不同字段用不同结构,相同开头句式不得连续使用;杜绝"有一定潜力""需要多沟通"式空话;同一章内不重复解释同一结构;不同命盘要有不同的判断与人物标签。
7. 优势与短板并存:重要判断写清核心优势、成因、发挥条件、何种环境下可能变短板。
8. 不写确定事实:不写必然结婚/破裂的年份、疾病诊断、子女数量、未来成就;不用"注定""必然""一定会""肯定是"等绝对化措辞(字段规格标注的标准量化格式除外:财富T档区间、缘分概率百分比、大运流年评分、子女性别准确率标注);不虚构用户经历,不使用未经核验的古籍引文。
9. 开头与措辞:可参考"从命局结构来看""传统命理中,这种组合通常被理解为""这一结构更强调""在现实生活中,可以将其理解为""值得留意的是"等进入方式,但不得机械轮换;禁止使用"你天生注定""你一定会""你的命运必然""你拥有无限潜力""只要努力就会成功""你是一个非常聪明的人"开头。
10. 输出必须是单个 JSON 对象(仅本章结构),不要 Markdown;字符串值内部禁止英文双引号(")和反斜杠,引用措辞一律用「」;键与值之间的冒号、字段之间的逗号不可省略,不要尾逗号。`;

// 明星报告版(称呼改 TA)
export const SECTION_STAR_SYSTEM_PROMPT = [
  SECTION_SYSTEM_PROMPT,
  "【明星报告附加规则】本报告对象是公众人物,全文一律用「TA」称呼(不用你/你们);出生时间不公开时排盘只有三柱,凡需时柱的判断如实写「时柱未定,依据不足」,不猜测。",
].join("\n\n");

// ── 章节视图:每章注入的命理事实子集(锚点全章一致) ────────────────────
function anchorBlock(judgment: BaziJudgment, key: SectionKey): string {
  const a = judgment.anchors;
  const lines = [
    `- 日主:${a.dayMaster}(${a.dayElement},${a.yinYang}干),${a.monthOrder.text}`,
    `- 旺衰档位:「${a.strength.level}」(${a.strength.score.support} vs ${a.strength.score.drain},${a.strength.rationale[a.strength.rationale.length - 1] ?? ""})`,
    `- 格局:「${a.pattern.name}」(成色:${a.pattern.tier};${a.pattern.basis})`,
    `- 喜用五行:${a.fuYong.favorable.join("、")};忌神五行:${a.fuYong.cautious.join("、")};闲神:${a.idle.join("、") || "无"}`,
    `- 调候:${a.tiaoHou.state}${a.tiaoHou.yongShen ? `,调候用神${a.tiaoHou.yongShen}` : ""}(${a.tiaoHou.relation})`,
    `- 十神排序:${a.tenGods.map((god) => `${god.category}${god.value}`).join(" > ")}`,
    `- 合化口径:${judgment.facts.heHuaNote}`,
  ];
  if (key === "wealth") lines.push(`- 财富档位:${a.wealthTier.tier}(${a.wealthTier.range}),推导链:${a.wealthTier.chain}`);
  if (key === "relationship") lines.push(`- ${a.spouseStar.basis}`);
  if (key === "children") lines.push(`- ${a.childrenStar.basis}`);
  if (key === "pattern") lines.push(`- 月令透干:${judgment.facts.transparentStems.join(";") || "月令藏干均未透出"}`);
  return lines.join("\n");
}

function annualCompact(judgment: BaziJudgment): string[] {
  return judgment.facts.annual.map((year) =>
    `${year.year}${year.ganzhi}(${year.score}分,${year.signals.join("/") || "无明显信号"},行${year.dayunGanzhi}运${year.liChunNote ? ";" + year.liChunNote : ""})`);
}

function dayunCompact(judgment: BaziJudgment): string[] {
  return judgment.facts.dayun.map((step) =>
    `${step.ganzhi}(${step.ageText},${step.yearText}${step.current ? ",当前大运" : ""}) 干支十神${step.ganGod}/${step.zhiGod},参考分${step.score};互动:${step.interactions.join(";") || "无"};${step.theme}`);
}

function sectionFacts(judgment: BaziJudgment, key: SectionKey): string {
  const pillars = judgment.facts.pillars.map((p) =>
    `${p.label}${p.ganzhi}(天干十神${p.shiShenGan},藏干${p.hideGan.join("、")}/${p.hideShiShen.join("、")},十二长生${p.diShi})`).join(";");
  const wuXing = `五行计数:${Object.entries(judgment.facts.wuXing).map(([k, v]) => `${k}${v}`).join("、")}${judgment.anchors.missingElements.length ? `,缺${judgment.anchors.missingElements.join("、")}` : ""}`;
  const relations = judgment.facts.relationTexts.length ? judgment.facts.relationTexts.join(";") : "四柱之间无明显合冲刑害";
  const shenSha = judgment.facts.shenSha.map((item) => item.meaning).join(";");

  switch (key) {
    case "portrait":
      return `【四柱】${pillars}\n【五行】${wuXing}\n【干支关系】${relations}\n【神煞】${shenSha}\n【旺衰依据】${judgment.anchors.strength.rationale.join("\n")}`;
    case "pattern":
      return `【四柱】${pillars}\n【月令】${judgment.anchors.monthOrder.text},藏干${judgment.facts.pillars[1].hideGan.join("、")}\n【月令透干】${judgment.facts.transparentStems.join(";") || "月令藏干均未透出"}\n【干支关系】${relations}`;
    case "education": {
      const edu = judgment.evidence.find((item) => item.id === "area.education")?.fact ?? "";
      return `【四柱】${pillars}\n【学业取象】${edu}\n【未来流年(只可引用区间内年份)】${annualCompact(judgment).join("、")}`;
    }
    case "career": {
      const career = judgment.evidence.find((item) => item.id === "area.career")?.fact ?? "";
      return `【四柱】${pillars}\n【事业取象】${career}\n【大运(顺序固定,不得编造)】\n${dayunCompact(judgment).join("\n")}\n【未来流年(只可引用区间内年份,${judgment.facts.annualRange})】${annualCompact(judgment).join("、")}`;
    }
    case "wealth":
      return `【财富档推导链(原样引用)】${judgment.anchors.wealthTier.chain}\n【四柱】${pillars}\n【大运】\n${dayunCompact(judgment).join("\n")}\n【未来流年】${annualCompact(judgment).join("、")}`;
    case "relationship":
      return `【配偶星与夫妻宫】${judgment.anchors.spouseStar.basis}\n【四柱】${pillars}\n【干支关系】${relations}\n【大运】\n${dayunCompact(judgment).join("\n")}\n【未来流年】${annualCompact(judgment).join("、")}`;
    case "wellbeing":
      return `【五行】${wuXing}\n【十神排序】${judgment.anchors.tenGods.map((god) => `${god.category}${god.value}(${god.level})`).join(" > ")}\n【旺衰】${judgment.anchors.strength.level}`;
    case "children":
      return `【子女星与子女宫】${judgment.anchors.childrenStar.basis}\n【四柱】${pillars}\n【喜忌】喜${judgment.anchors.fuYong.favorable.join("、")}/忌${judgment.anchors.fuYong.cautious.join("、")}`;
    case "family": {
      const parents = judgment.evidence.find((item) => item.id === "area.parents")?.fact ?? "";
      const siblings = judgment.evidence.find((item) => item.id === "area.siblings")?.fact ?? "";
      return `【四柱】${pillars}\n【六亲取星】${parents}\n【同辈】${siblings}`;
    }
  }
}

/** 字段规格 → prompt 文本 */
function fieldRuleText(spec: FieldSpec): string {
  const lines = [
    `${spec.order}. ${spec.id}(上限${spec.lengthLimit}字)——${spec.title}`,
    `   结构:${spec.writingStructure}`,
  ];
  if (spec.interpretationRules.length) lines.push(`   推导:${spec.interpretationRules.join(";")}`);
  if (spec.triggerConditions) lines.push(`   触发:${spec.triggerConditions}`);
  if (spec.prohibited.length) lines.push(`   禁止:${spec.prohibited.join(";")}`);
  if (spec.evidence.length) {
    const evidenceText = spec.evidence.map((id) => (id.includes(".") ? id : id + ". 开头")).join("、");
    lines.push(`   建议引用证据:${evidenceText}`);
  }
  return lines.join("\n");
}

function evidenceList(judgment: BaziJudgment, key: SectionKey): string {
  const specIds = new Set(fieldSpecsOfSection(key).flatMap((spec) => spec.evidence));
  const relevant = judgment.evidence.filter((item) =>
    [...specIds].some((prefix) => prefix.includes(".") ? item.id === prefix : item.id.startsWith(prefix)));
  const pool = relevant.length >= 4 ? relevant : judgment.evidence;
  return pool.map((item) => `- ${item.id}: ${item.fact}`).join("\n");
}

export function buildSectionPrompt(judgment: BaziJudgment, key: SectionKey, retryNote?: string): string {
  const specs = fieldSpecsOfSection(key);
  const limits = specs.map((spec) => `${spec.id}${spec.lengthLimit}`).join("、");
  return `请依据下面的排盘判断,生成《MeVerse 个人八字报告》的「${SECTION_TITLES[key]}」章节,只输出本章的 JSON 对象。

【全局命理结论(锚点,必须原样引用,不得改判)】
${anchorBlock(judgment, key)}

【本章命理事实】
${sectionFacts(judgment, key)}

【本章字段规则】insights 按下列字段顺序组织,label 用字段名,不增不减不改序:
${specs.map(fieldRuleText).join("\n")}

【表达层硬约束】
- 语气:命理师断语感——克制、具体、有判断力;不堆形容词、不写营销文案腔。
- 每字段第一句必须是结论句;短句直断;术语后括号紧跟白话;每字段感叹号最多2个。
- 禁用词:${BANNED_STYLE_WORDS.join("/")}。
- 各字段字数上限(超出即违规):${limits};其余字段${DEFAULT_FIELD_CHAR_LIMIT}。超限先删修饰语与重复论证,不删命理判断。
- 字数下限:结论字段不低于30字,画像与时间线字段按内容自然展开,不为凑字扩写。

【输出 JSON 结构】(只输出本章对象;evidenceIds 从文末清单选,每字段最多4个,可为空)
{"title":"${SECTION_TITLES[key]}","summary":"一句话章摘要(30字内)","insights":[{"label":"字段名","content":"完整解读","evidenceIds":["id"]}],"advice":["2-3条本章可执行建议,每条15-50字"]}

【可用证据清单】
${evidenceList(judgment, key)}${retryNote ? `\n\n【上次输出未通过校验,必须修正】\n${retryNote}\n请修正以上问题后重新输出完整本章 JSON。` : ""}`;
}

// ── 单章生成:模型调用 → 解析 → 结构校验 → 字段顺序预检 ─────────────────
async function generateSection(
  callModel: CallModel,
  system: string,
  judgment: BaziJudgment,
  key: SectionKey,
  retryNote?: string,
): Promise<SectionDraft> {
  const prompt = buildSectionPrompt(judgment, key, retryNote);
  // 单章超时守卫:成功后必须清定时器,否则进程要等满 150s 才能退出
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`章节 ${key} 生成超时`)), SECTION_CALL_TIMEOUT_MS);
  });
  let raw: string;
  try {
    raw = await Promise.race([callModel(system, prompt), timeout]);
  } finally {
    clearTimeout(timer);
  }
  const parsed = parseModelJson(extractJson(raw));
  const draft = sectionSchema.parse(parsed);
  const expected = fieldSpecsOfSection(key).map((spec) => spec.id);
  const actual = draft.insights.map((item) => item.label);
  if (actual.join("|") !== expected.join("|")) {
    throw new Error(`字段结构与顺序不符:期望[${expected.join("、")}],实际[${actual.join("、")}]`);
  }
  return draft as SectionDraft;
}

// ── 组装完整报告 ────────────────────────────────────────────────────────
function assemble(judgment: BaziJudgment, sections: Partial<Record<SectionKey, SectionDraft>>): StaticReading {
  const full = {
    schemaVersion: "single-full-v3" as const,
    scope: "full-reading" as const,
    sections: Object.fromEntries(sectionKeys.map((key) => [key, sections[key]])),
    evidence: judgment.evidence,
    timelines: judgment.timelines,
    disclaimer: "本报告基于传统命理文化,由确定性排盘引擎与命理规则层计算、AI 负责文案翻译协作生成;命理判断属于传统文化解释体系,仅供自我观察参考,不构成科学预测或医疗、投资、婚姻等重大决策依据。",
  };
  return staticReadingSchema.parse(full);
}

/** 必须修复否则抛错的硬性规则(其余表达类违规修复 2 轮后可容忍放行) */
const FATAL_RULES = new Set([
  "章节缺失", "字段结构与顺序", "旺衰口径冲突", "格局名冲突",
  "干支不存在", "流年越界", "大运不存在", "喜神不一致", "忌神不一致", "引用证据无效",
]);

/**
 * V3 主入口:9 章并行生成 → 失败章定向重试 → 组装校验 → 一致性违规章定向重生成。
 * 任一环节最终失败则抛错(由 runReadingGeneration 兜底 failed + 退款)。
 */
export async function generateStaticReadingV3(
  callModel: CallModel,
  judgment: BaziJudgment,
  options?: { systemPrompt?: string; promptSuffix?: string },
): Promise<StaticReading> {
  const startedAt = Date.now();
  const system = options?.systemPrompt ?? SECTION_SYSTEM_PROMPT;
  const withinBudget = () => Date.now() - startedAt < TOTAL_BUDGET_MS;
  const targets = () => sectionKeys.filter((key) => judgment.meta.hasHourPillar || key !== "children");
  // notes 非空 = 待(重新)生成;INITIAL 哨兵表示首轮待生成(不作为重试提示注入 prompt)
  const INITIAL = "pending";
  const retryNoteOf = (key: SectionKey) => {
    if (!notes[key] || notes[key] === INITIAL) return options?.promptSuffix || undefined;
    return [notes[key], options?.promptSuffix].filter(Boolean).join("\n");
  };

  const sections: Partial<Record<SectionKey, SectionDraft>> = {};
  const notes: Partial<Record<SectionKey, string>> = {};
  targets().forEach((key) => { notes[key] = INITIAL; });

  const callBatch = async (keys: SectionKey[]) =>
    Promise.allSettled(keys.map((key) => generateSection(callModel, system, judgment, key, retryNoteOf(key))));

  for (let round = 0; round <= MAX_REPAIR_ROUNDS; round += 1) {
    // 1. 生成本轮需要处理的章节(notes 非空的 = 失败章或违规章)
    const pending = targets().filter((key) => Boolean(notes[key]));
    if (pending.length) {
      const settled = await callBatch(pending);
      pending.forEach((key, index) => {
        const result = settled[index];
        if (result.status === "fulfilled" && result.value) {
          sections[key] = result.value;
          notes[key] = "";
        } else {
          const reason = result.status === "rejected"
            ? (result.reason instanceof Error ? result.reason.message : String(result.reason))
            : "模型返回空结果";
          notes[key] = `上次输出未通过校验:${reason}`;
        }
      });
    }

    // 2. 仍有缺失章:最后一轮或超预算即失败,否则下轮重试
    const missing = targets().filter((key) => !sections[key]);
    if (missing.length) {
      if (round === MAX_REPAIR_ROUNDS || !withinBudget()) {
        throw new Error(`章节生成失败:${missing.map((key) => `${key}(${notes[key] || "未生成"})`).join(";").slice(0, 200)}`);
      }
      continue;
    }

    // 3. 组装 + 跨章一致性校验
    const report = assemble(judgment, sections);
    const violations = checkConsistency(report, judgment);
    if (!violations.length) return report;

    const isLastChance = round === MAX_REPAIR_ROUNDS || !withinBudget();
    if (isLastChance) {
      const fatal = violations.filter((violation) => FATAL_RULES.has(violation.rule));
      if (fatal.length) {
        throw new Error(`一致性校验未通过:${fatal.slice(0, 3).map((v) => `[${v.section ?? ""}${v.field ? ":" + v.field : ""}]${v.rule}`).join(";").slice(0, 200)}`);
      }
      return report; // 表达类违规已修复 2 轮,容忍放行(禁词/字数已尽力)
    }

    // 4. 违规章节排入下轮定向重生成
    for (const [key, list] of violationsBySection(violations)) {
      notes[key] = list.slice(0, 6).map((line) => `- ${line}`).join("\n");
      delete sections[key];
    }
  }
  throw new Error("REPORT_V3_GENERATION_EXHAUSTED");
}
