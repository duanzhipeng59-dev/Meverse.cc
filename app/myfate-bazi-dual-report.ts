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

export async function generateBaziMatchReport(subjectA: BaziSubjectInput, subjectB: BaziSubjectInput): Promise<BaziMatchReport> {
  const prompt = `请严格按要求输出完整 JSON。报告覆盖：基础评分与雷达图、双方本命婚恋底色、五行互补、日柱夫妻宫、沟通与冲突、家庭背景、岁运与神煞边界、双方行动建议。输入只包含双方四柱原始信息，无法从四柱确认的内容必须明确写“未提供，无法判断”，不要自行推导具体年份或神煞。\n\n输入：\n${JSON.stringify({ maleOrA: subjectJson(subjectA), femaleOrB: subjectJson(subjectB) }, null, 2)}\n\nJSON 字段必须完全匹配：overview、profiles、analysis、timeline、actionableAdvice。`;
  const result = await generateChatText(SYSTEM_PROMPT, [{ role: "user", content: prompt }], { provider: "gemini", temperature: 0.35, maxTokens: 18000, json: true });
  const start = result.content.indexOf("{"); const end = result.content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("BAZI_DUAL_INVALID_JSON");
  return baziMatchReportSchema.parse(JSON.parse(result.content.slice(start, end + 1)));
}
