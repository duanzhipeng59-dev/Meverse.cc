// 双星合盘报告生成:结构引擎事实 + 时间层结构化数据 → AI 翻译为章节文案与关系节奏。
// 评分只由引擎在创建时算出并落库,AI 不得改分;时间范围由后端计算并硬性约束,
// Gemini 只能在 available_time_range 内归纳阶段,输出越界由后端裁剪;失败退款按消费流水幂等执行。
import { z } from "zod";
import { createSupabaseAdminClient } from "./api/auth/server";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import { buildDualChart, buildDualStructure, type DualStructure } from "./myfate-dual-engine";
import { buildPersonTimeline, computeAvailableRange, futureRhythmSchema, personAnnualRange, sanitizeFutureRhythm, type AnnualLuckYear, type MajorLuckStep, type PersonTimeline, type YearRange } from "./myfate-dual-timeline";
import { getCelebrityVedicBirth } from "./myfate-stars-server";

const sectionSchema = z.object({
  headline: z.string().min(8).max(60),
  basis: z.array(z.string().min(6).max(120)).min(1).max(4),
  aToB: z.string().min(10).max(200),
  bToA: z.string().min(10).max(200),
  behavior: z.string().min(10).max(200),
  risk: z.string().min(10).max(200),
  advice: z.string().min(10).max(160),
});

export const dualReportSchema = z.object({
  keywords: z.array(z.string().min(2).max(6)).min(2).max(4),
  summary: z.string().min(15).max(140),
  sections: z.object({
    attraction: sectionSchema,
    communication: sectionSchema,
    intimacy: sectionSchema,
    conflict: sectionSchema,
    career: sectionSchema,
    longterm: sectionSchema,
    // 旧版报告的时间线章节,仅作历史数据兼容读取
    timeline: sectionSchema.optional(),
  }),
  future_rhythm: futureRhythmSchema.optional(),
  available_time_range: z.object({ start_year: z.number().int(), end_year: z.number().int() }).nullable().optional(),
  basis: z.array(z.object({ term: z.string().min(2).max(40), plain: z.string().min(8).max(160), confidence: z.enum(["strong", "medium", "light"]).default("medium") })).min(4).max(10),
});

export type DualReportContent = z.infer<typeof dualReportSchema>;

const SYSTEM_PROMPT = `你是精通传统子平八字、现代亲密关系与认知心理学的资深合盘顾问。你要输出一份结构清晰、具体自然、温和克制、具有现实指导意义的双人深度关系报告。整体写法参考个人解读报告：每个章节先给出清楚的章节结论，再展开若干具体洞察，最后落到可执行建议。

核心红线:
1. 去宿命论,重在启发。严禁"克夫/克妻"、"注定分手/离婚"、"八字相克必有一伤"等恐吓性断言;刑冲克害必须翻译为认知差异、行为惯性或沟通盲区。
2. 凡有冲突,必须同时给出心理成因与建设性化解策略,不得只制造焦虑。
3. 只使用 Input JSON 已提供的干支、十神、五行、柱位、冲合列表、大运与流年事实,严禁补造干支、神煞、事件或年份。
4. 语言简体中文,专业、克制、具体、有人文关怀,杜绝轻浮的星座占卜口吻。
5. 公众人物只做命理模型中的互动倾向解读,不暗示现实恋爱、合作或私人关系。
6. 严格输出 JSON,不要输出 Markdown、代码围栏或 JSON 以外的文字。`;

// 七大板块的正式内容规范。写法参考个人报告的“章节总起 + 洞察段落 + 建议”；JSON 只是程序传输协议,页面会将这些字段排版为报告章节。
const DEEP_RELATION_REPORT_GUIDE = `
【双人深度关系合盘报告规范】
报告必须完整覆盖七大板块,并按以下逻辑写作:
一、关系总览与缘分定性:综合契合度(吸引力、默契度、沟通感、财富协作、稳定性;分数由系统引擎提供,不可自行编造);关系原型标签;基于输入中的日干、地支、纳音等事实解释核心吸引力。
二、能量气场与五行互补:喜用神互助度;寒暖燥湿调候体验;身旺身弱与关系中的气场平衡。只能引用输入已有事实。
三、心理性格与相处模式:将官杀、食伤、印星、比劫、财星翻译为控制感、自由度、安全感、竞争心与务实度等现代心理语言;分析表达差异、信息断层、决策权与话语权。
四、现实生活与世俗整合:财务观念与财富协作;年月柱对应的原生家庭与长辈边界;时柱与子女星对应的长期生活、育儿与责任分担。不得虚构家庭事件。
五、磨合雷区与风险预警:夫妻宫及已有刑冲破害对应的具体触发场景;还原“行为触发→防御机制→反弹→升级”的冲突循环;说明亲密边界与安全感维护方式。每个风险后必须紧跟成因和解法。
六、时序节律与运势同步:只分析 available_time_range 内已有年份;说明关系推进窗口、双方大运高低错位与未来3-5年可见的压力或支持阶段,使用趋势语言,不预测确定事件。
七、专属通关说明书:分别给双方两条具体可执行的行动建议;提炼输入事实对应的通关五行,转译为共同生活、兴趣习惯或空间环境建议。

行文要求:每章按“章节结论(headline)→结构洞察(basis/aToB/bToA/behavior)→风险与建议(risk/advice)”组织,效果接近个人报告的“title/summary/insights/advice”;所有结论都要落到“结构事实→心理/行为表现→可执行建议”;避免空泛形容词。不要使用“宿命吸引力”作为确定性结论,可改写为“底层吸引机制”。`;

const SECTION_SPECS: Array<{ key: "attraction" | "communication" | "intimacy" | "conflict" | "career" | "longterm"; title: string; hint: string }> = [
  { key: "attraction", title: "核心吸引来源", hint: "两人容易被对方哪部分吸引、初期化学反应、吸引中的落差" },
  { key: "communication", title: "情绪与沟通方式", hint: "表达差异、谁更主动、谁更需要空间、易误解处与更适合的沟通方式" },
  { key: "intimacy", title: "亲密关系模式", hint: "亲近时的相处质地、依赖与独立、亲密需求是否匹配" },
  { key: "conflict", title: "冲突触发点", hint: "最容易摩擦的位置、典型表现、各自防御方式、更合适的处理方法" },
  { key: "career", title: "事业与资源协作", hint: "是否适合共同工作、能力互补、决策与权责、合作冲突点" },
  { key: "longterm", title: "长期关系潜力", hint: "关系持续的动力、靠近或疏远的原因、长期维持条件;不预测现实结果" },
];

function majorLuckJson(step: MajorLuckStep) {
  return {
    start_age: step.startAge,
    end_age: step.endAge,
    start_year: step.startYear,
    end_year: step.endYear,
    pillar: step.pillar,
    heavenly_stem: step.heavenlyStem,
    earthly_branch: step.earthlyBranch,
    ten_god_stem: step.tenGodStem,
    ten_god_branch: step.tenGodBranch,
    relationships_with_natal_chart: step.relationshipsWithNatalChart,
    extra_data: step.extraData,
  };
}

function annualLuckJson(year: AnnualLuckYear) {
  return {
    year: year.year,
    pillar: year.pillar,
    heavenly_stem: year.heavenlyStem,
    earthly_branch: year.earthlyBranch,
    ten_god_stem: year.tenGodStem,
    ten_god_branch: year.tenGodBranch,
    relationships_with_natal_chart: year.relationshipsWithNatalChart,
    relationships_with_major_luck: year.relationshipsWithMajorLuck,
    extra_data: year.extraData,
  };
}

function personJson(
  star: DualStructure["starA"],
  timeline: PersonTimeline,
  crossStem: string[],
  crossBranch: string[],
  spousePalace: DualStructure["spousePalace"],
  elementBalance: DualStructure["elementBalance"],
  strengthNote: string,
  hiddenGods: DualStructure["hiddenGods"],
) {
  return {
    name: star.name,
    natal_chart: {
      four_pillars: { year: star.pillars[0], month: star.pillars[1], day: star.pillars[2], hour: star.pillars[3] },
      day_master: star.dayMaster,
      five_elements: timeline.fiveElements,
      ten_gods: timeline.tenGods.map((pillar) => ({
        position: pillar.position,
        ganzhi: pillar.ganzhi,
        stem_ten_god: pillar.stemTenGod,
        hidden_ten_gods: pillar.hiddenTenGods,
      })),
      spouse_palace: { branch: star.pillars[2][1], interaction: spousePalace.text },
      stems: timeline.stems,
      branches: timeline.branches,
      stem_relationships: crossStem,
      branch_relationships: crossBranch,
      extra_chart_data: {
        strength: star.strength,
        pattern: star.pattern,
        favorable: star.favorable,
        cautious: star.cautious,
        element_balance: elementBalance.text,
        strength_note: strengthNote,
        hidden_gods: hiddenGods.map((h) => `${h.side} ${h.pos} 藏干${h.hidden}(${h.god})`),
      },
    },
    major_luck: timeline.majorLuck.map(majorLuckJson),
    annual_luck: timeline.annualLuck.map(annualLuckJson),
  };
}

// 规格 Input:双方原局 + 大运 + 流年 + 双方可分析时间范围,全部确定性数据
function buildGeminiInput(s: DualStructure, timelineA: PersonTimeline, timelineB: PersonTimeline, range: YearRange | null) {
  const crossStem = s.ganCombinations;
  const crossBranch = [
    ...s.branchInteractions.map((x) => `A ${["年柱", "月柱", "日柱", "时柱"][x.aPos]}${x.aZhi} × B ${["年柱", "月柱", "日柱", "时柱"][x.bPos]}${x.bZhi} ${x.type}——${x.meaning}`),
    ...s.combinations.map((c) => `${c.type}(${c.branches.join("")})——${c.meaning}`),
  ];
  return {
    available_time_range: range ? { start_year: range.startYear, end_year: range.endYear } : null,
    person_a: personJson(s.starA, timelineA, crossStem, crossBranch, s.spousePalace, s.elementBalance, s.strengthNote, s.hiddenGods),
    person_b: personJson(s.starB, timelineB, crossStem, crossBranch, s.spousePalace, s.elementBalance, s.strengthNote, s.hiddenGods),
  };
}

export function buildPrompt(s: DualStructure, timelineA: PersonTimeline, timelineB: PersonTimeline, range: YearRange | null, opts?: { dualType?: "love" | "career" }) {
  const input = buildGeminiInput(s, timelineA, timelineB, range);
  const sections = SECTION_SPECS.map(({ key, title, hint }) => `"${key}": { "headline": "一句话结论(8-40字)", "basis": ["引用结构事实的依据,1-3条"], "aToB": "A 对 B 的影响(结合十神方向)", "bToA": "B 对 A 的影响", "behavior": "现实中可能出现的相处表现", "risk": "容易发生的问题", "advice": "如何相处更顺畅(可执行)" } /* ${title}: ${hint} */`).join(",\n    ");
  const rangeLine = range
    ? `本次可分析时间范围为 ${range.startYear}-${range.endYear} 年(available_time_range)。future_rhythm 的所有阶段年份必须完全落在该范围内。`
    : `本次 available_time_range 为 null(双方没有共同流年数据),future_rhythm 的两个数组都必须输出为空数组 []。`;
  const typeLine = opts?.dualType === "career"
    ? "合盘类型:事业合伙——全部解读以合伙做事视角展开:分工协作、资源互补、利益分配、决策风格与信任风险;aToB/bToA/behavior/risk/advice 都围绕事业伙伴关系书写,不要写恋爱、婚姻或暧昧内容。"
    : "合盘类型:感情合婚——全部解读以亲密关系与婚恋相处视角展开。";
  return `${DEEP_RELATION_REPORT_GUIDE}

Input JSON(唯一事实来源):

${JSON.stringify(input, null, 1)}

${rangeLine}

${typeLine}

future_rhythm(未来关系节奏)规则:
1. 分析顺序:双方原局关系 → 双方当前大运环境 → 双方具体流年触发 → 双方互动结果 → 归纳为关系阶段;禁止仅凭单方流年判断双方关系。
2. 阶段压缩:把连续且关系特征相近的年份合并为一个阶段输出,不要逐年流水账;与前后年份明显不同的单年可以独立成阶段。
3. supportive_periods 与 pressure_periods 各最多 3 个,优先选择变化最明显、对双方关系影响最大、最值得关注的阶段;不允许为凑满数量强行生成,没有就输出空数组。
4. 每个阶段:label 为阶段概括(4-16字,如"关系压力集中阶段"/"关系调整节点");detail 描述该阶段双方关系环境与互动趋势(20-120字),只能使用"更适合/压力可能增加/议题更值得关注"等趋势表达。
5. 不得输出早于 start_year 或晚于 end_year 的年份,不得补充或推导双方没有共同流年数据的年份。

输出 JSON:
{
  "keywords": [2-4个关系关键词,每个2-6字],
  "summary": "一句话关系画像,30-90字",
  "sections": {
    ${sections}
  },
  "future_rhythm": {
    "supportive_periods": [ { "start_year": ${range ? range.startYear : 0}, "end_year": ${range ? range.startYear : 0}, "label": "阶段概括4-16字", "detail": "该阶段双方关系环境与互动趋势,20-120字" } ],
    "pressure_periods": [ { "start_year": ${range ? range.startYear : 0}, "end_year": ${range ? range.startYear : 0}, "label": "阶段概括4-16字", "detail": "该阶段双方关系环境与互动趋势,20-120字" } ]
  },
  "basis": [ { "term": "命理术语", "plain": "白话解释20-80字", "confidence": "strong|medium|light(按输入事实强度)" } ]
}
basis 至少 5 条,必须来自 Input JSON 中的结构事实,confidence 与事实强度一致。

行文代称规则:全文(sections 的 headline/aToB/bToA/behavior/risk/advice 与 future_rhythm 的 label/detail)必须直接使用两人真实姓名「${s.starA.name}」和「${s.starB.name}」,不得使用 A/B 或"对方"等代称。`;
}

// 双人报告文案归一:把 AI 残留的 A/B 代称替换为两人姓名(独立字母,不误伤英文名)
export function withPersonNames(text: string, nameA: string, nameB: string): string {
  return text.replace(/(?<![A-Za-z])A(?![A-Za-z])/g, nameA).replace(/(?<![A-Za-z])B(?![A-Za-z])/g, nameB);
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("NO_JSON");
  return text.slice(start, end + 1);
}

export async function generateContent(s: DualStructure, timelineA: PersonTimeline, timelineB: PersonTimeline, range: YearRange | null, opts?: { dualType?: "love" | "career" }): Promise<DualReportContent> {
  const prompt = buildPrompt(s, timelineA, timelineB, range, opts);
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const generation = await generateChatText(SYSTEM_PROMPT, [{ role: "user", content: prompt }], { temperature: 0.65, maxTokens: 12000 });
    try {
      const parsed = dualReportSchema.parse(JSON.parse(extractJson(generation.content)));
      // 有可分析范围时 future_rhythm 必须存在,缺失视为无效输出触发重试
      if (range && !parsed.future_rhythm) throw new Error("FUTURE_RHYTHM_MISSING");
      return {
        ...parsed,
        future_rhythm: sanitizeFutureRhythm(parsed.future_rhythm ?? { supportive_periods: [], pressure_periods: [] }, range),
        available_time_range: range ? { start_year: range.startYear, end_year: range.endYear } : null,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("DUAL_GENERATE_INVALID");
}

export async function runDualGeneration(reportId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: report, error: fetchError } = await supabase
    .from("dual_star_reports")
    .select("id, user_id, star_a, star_b, charge_ledger_id")
    .eq("id", reportId)
    .maybeSingle();
  if (fetchError || !report) return;
  try {
    const [birthA, birthB] = await Promise.all([getCelebrityVedicBirth(report.star_a), getCelebrityVedicBirth(report.star_b)]);
    if (!birthA || !birthB) throw new Error("BIRTH_DATA_MISSING");
    const dualA = buildDualChart(birthA);
    const dualB = buildDualChart(birthB);
    const structure = buildDualStructure(birthA, birthB, dualA.chart, dualB.chart, dualA.profile, dualB.profile);
    // 双方可分析时间范围 = 两人流年窗口交集;无交集时 range 为 null,报告不做时间节奏分析
    const currentYear = new Date().getFullYear();
    const rangeA = personAnnualRange(currentYear);
    const rangeB = personAnnualRange(currentYear);
    const range = computeAvailableRange(rangeA, rangeB);
    const timelineA = buildPersonTimeline(dualA.chart, range ?? rangeA);
    const timelineB = buildPersonTimeline(dualB.chart, range ?? rangeB);
    const content = await generateContent(structure, timelineA, timelineB, range);
    const { error: updateError } = await supabase.from("dual_star_reports").update({
      status: "ready",
      keywords: content.keywords,
      summary: content.summary,
      content: content as unknown as Record<string, unknown>,
      error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", reportId);
    if (updateError) throw updateError;
  } catch (error) {
    const message = error instanceof Error ? error.message : "DUAL_GENERATE_FAILED";
    console.error("Dual report generation failed", reportId, message);
    await supabase.from("dual_star_reports").update({
      status: "failed",
      error: message.slice(0, 200),
      updated_at: new Date().toISOString(),
    }).eq("id", reportId);
    // 幂等退款:按创建时绑定的消费流水,同一笔只会退一次;免费模式无流水不退
    const ledgerId = report.charge_ledger_id as number | null;
    if (ledgerId !== null) {
      const { error: refundError } = await supabase.rpc("refund_dual_charge", { p_ledger_id: ledgerId });
      if (refundError) console.error("Dual refund failed", reportId, refundError.message);
    }
  }
}
