import { z } from "zod";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import type { ReadingSubject } from "./myfate-reading-server";

const profileSchema = z.object({ name: z.string(), bazi: z.string(), dayMaster: z.string(), traits: z.string(), marriagePalace: z.string() });
const detailSchema = z.object({ score: z.number().min(0).max(100), title: z.string(), description: z.string() });
const riskSchema = z.object({ year: z.string(), riskLevel: z.string(), reason: z.string(), mitigation: z.string() });
const timelineSchema = z.object({ year: z.string(), significance: z.string() });

export const baziMatchReportSchema = z.object({
  overview: z.object({ matchScore: z.number().min(0).max(100), matchLevel: z.string(), oneSentenceSummary: z.string(), tags: z.array(z.string()), radar: z.object({ attraction: z.number(), tacitUnderstanding: z.number(), stability: z.number(), nourishment: z.number(), familyAcceptance: z.number() }) }),
  profiles: z.object({ male: profileSchema, female: profileSchema }),
  analysis: z.object({ wuxingNourishment: detailSchema, dayPillarAffinity: detailSchema, interactionDynamics: detailSchema, familyBackground: detailSchema, shenShaInteractions: z.array(z.object({ name: z.string(), type: z.string(), description: z.string() })) }),
  timeline: z.object({ marriageWindow: z.array(timelineSchema), riskYears: z.array(riskSchema) }),
  actionableAdvice: z.object({ toMale: z.array(z.string()), toFemale: z.array(z.string()), fengShuiAndLifestyle: z.array(z.string()) }),
});
export type BaziMatchReport = z.infer<typeof baziMatchReportSchema>;

const SYSTEM_PROMPT = `你是一位精通传统子平八字命理与现代亲密关系心理学的资深合婚咨询专家。请根据输入的男女双方四柱，输出结构化 JSON 双人八字合盘报告。
核心规则：去宿命论，不使用克夫、克妻、断头婚、注定离婚等恐吓性表达；刑冲克害必须翻译为性格摩擦、沟通雷区和心理防卫机制，并给出具体化解方案。只使用输入四柱事实，不得补造大运、流年、神煞、十神、事件或年份；没有事实支持的字段写“未提供，无法判断”。不得暗示公众人物现实恋爱或私人关系。只输出 JSON，不要 Markdown 或解释文字。`;

type BaziSubjectInput = ReadingSubject & { fourPillars: Array<{ label: string; ganzhi: string }> };
function subjectJson(subject: BaziSubjectInput) { return { name: subject.name, gender: subject.gender, birthDate: subject.birthDate, fourPillars: subject.fourPillars }; }

// zod 错误转成给模型的纠错提示(取首个字段路径)
function describeIssue(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const issueMatch = /"path":\s*\[\s*"([^"]+)"/.exec(message);
  return issueMatch ? `字段 ${issueMatch[1]} 缺失或类型不符` : message.slice(0, 100);
}

export async function generateBaziMatchReport(subjectA: BaziSubjectInput, subjectB: BaziSubjectInput): Promise<BaziMatchReport> {
  const basePrompt = `请严格按要求输出完整 JSON。报告覆盖：基础评分与雷达图、双方本命婚恋底色、五行互补、日柱夫妻宫、沟通与冲突、家庭背景、岁运与神煞边界、双方行动建议。输入只包含双方四柱原始信息，无法从四柱确认的内容必须明确写“未提供，无法判断”，不要自行推导具体年份或神煞。

输入：
${JSON.stringify({ maleOrA: subjectJson(subjectA), femaleOrB: subjectJson(subjectB) }, null, 2)}

输出 JSON 结构(字段名、类型、嵌套必须完全一致,禁止改名、增删字段或外层包装;profiles 固定用 male/female 两个键):

{
  "overview": { "matchScore": 0到100的数值, "matchLevel": "如:中上等合婚", "oneSentenceSummary": "一句话关系总结", "tags": ["2-4个关键词"], "radar": { "attraction": 0到100, "tacitUnderstanding": 0到100, "stability": 0到100, "nourishment": 0到100, "familyAcceptance": 0到100 } },
  "profiles": { "male": { "name": "姓名", "bazi": "四柱干支", "dayMaster": "日主", "traits": "本命婚恋底色", "marriagePalace": "日支夫妻宫解读" }, "female": { "name": "姓名", "bazi": "四柱干支", "dayMaster": "日主", "traits": "本命婚恋底色", "marriagePalace": "日支夫妻宫解读" } },
  "analysis": { "wuxingNourishment": { "score": 0到100, "title": "标题", "description": "解读" }, "dayPillarAffinity": { "score": 0到100, "title": "标题", "description": "解读" }, "interactionDynamics": { "score": 0到100, "title": "标题", "description": "解读" }, "familyBackground": { "score": 0到100, "title": "标题", "description": "解读" }, "shenShaInteractions": [ { "name": "名称", "type": "类型", "description": "解读;未提供神煞则空数组" } ] },
  "timeline": { "marriageWindow": [ { "year": "如:2027-2029", "significance": "依据与意义;未提供则空数组" } ], "riskYears": [ { "year": "年份或年份特征", "riskLevel": "低/中/高", "reason": "成因", "mitigation": "化解建议;未提供则空数组" } ] },
  "actionableAdvice": { "toMale": ["给男方/A方的具体建议"], "toFemale": ["给女方/B方的具体建议"], "fengShuiAndLifestyle": ["生活方式相处调节建议"] }
}`;
  // 双人合盘与个人解读统一走 Gemini，保证线上使用同一套可用的生成链路。
  // 模型偶发漏字段/换命名:带纠错提示重试,而非一次失败整单作废。
  let lastError: unknown;
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // 重试预算:单次上限 240s,总时长超 40s 就不再重试,保证 300s 函数预算内能落 failed 状态
    if (attempt > 0 && Date.now() - startedAt > 40_000) break;
    const suffix = attempt ? `\n\n上次输出未通过结构校验：${describeIssue(lastError)}。请修正后重新输出完整 JSON（顶层键：overview、profiles、analysis、timeline、actionableAdvice；overview 必须含数值型 matchScore，profiles 必须同时有 male 与 female）。` : "";
    try {
      const result = await generateChatText(SYSTEM_PROMPT, [{ role: "user", content: basePrompt + suffix }], { provider: "gemini", temperature: 0.35, maxTokens: 30000, json: true });
      const start = result.content.indexOf("{"); const end = result.content.lastIndexOf("}");
      if (start < 0 || end <= start) throw new Error("BAZI_DUAL_INVALID_JSON");
      const parsed = JSON.parse(result.content.slice(start, end + 1)) as Record<string, unknown>;
      const candidate = (parsed.report ?? parsed.data ?? parsed.result ?? parsed.output ?? parsed) as Record<string, unknown>;
      const profiles = (candidate.profiles ?? {}) as Record<string, unknown>;
      if (!profiles.male && (profiles.personA ?? profiles.maleOrA)) profiles.male = profiles.personA ?? profiles.maleOrA;
      if (!profiles.female && (profiles.personB ?? profiles.femaleOrB)) profiles.female = profiles.personB ?? profiles.femaleOrB;
      candidate.profiles = profiles;
      // 常见命名兜底:蛇形命名的 matchScore / 雷达五维
      const overview = (candidate.overview ?? {}) as Record<string, unknown>;
      if (typeof overview.matchScore !== "number" && typeof overview.match_score === "number") overview.matchScore = overview.match_score;
      candidate.overview = overview;
      return baziMatchReportSchema.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("BAZI_DUAL_GENERATE_FAILED");
}
