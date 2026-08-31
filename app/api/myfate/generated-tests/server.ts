import { z } from "zod";
import type {
  FormulaTestResult,
  FormulaVerdictKey,
  GeneratedTestQuestion,
} from "../../../myfate-generated-test-types";

const optionSchema = z.object({
  label: z.string().trim().min(2).max(300),
  explanation: z.string().trim().min(8).max(800),
});

const designBasisSchema = z.object({
  mbti: z.string().trim().min(8).max(500),
  threePillars: z.string().trim().min(4).max(500),
  coreConcern: z.string().trim().min(4).max(300),
  reason: z.string().trim().min(8).max(800),
});

const globalBasisSchema = z.object({
  mbti: z.string().trim().min(8).max(800),
  threePillars: z.string().trim().min(8).max(800),
  coreConcerns: z.array(z.string().trim().min(2).max(120)).min(3).max(5),
  summary: z.string().trim().min(12).max(1200),
});

const storedQuestionSchema = z.object({
  question: z.string().trim().min(8).max(500),
  eyebrow: z.string().trim().min(2).max(80).optional().default("专属情境"),
  dimension: z.string().trim().min(2).max(80).optional().default("关系回应"),
  testType: z.enum(["核心需求满足", "脆弱点承接", "长期磨合"]),
  riskItem: z.boolean(),
  targetTrait: z.string().trim().min(2).max(500).optional(),
  intent: z.string().trim().min(4).max(800).optional(),
  designBasis: designBasisSchema.optional(),
  correctIndex: z.number().int().min(0).max(3),
  options: z.array(optionSchema).length(4),
});

export const generatedPayloadSchema = z.object({
  relationshipNeeds: z.array(z.string().trim().min(2).max(300)).min(5).max(7),
  globalBasis: globalBasisSchema.optional(),
  questions: z.array(storedQuestionSchema).length(25),
}).superRefine((payload, context) => {
  const risks = payload.questions.filter((question) => question.riskItem).length;
  if (risks !== 5) context.addIssue({ code: "custom", message: "exactly_five_risk_items" });
  const typeCounts = payload.questions.reduce<Record<string, number>>((counts, question) => {
    counts[question.testType] = (counts[question.testType] ?? 0) + 1;
    return counts;
  }, {});
  const core = typeCounts["核心需求满足"] ?? 0;
  const vulnerable = typeCounts["脆弱点承接"] ?? 0;
  const longTerm = typeCounts["长期磨合"] ?? 0;
  if (core < 9 || core > 10 || vulnerable < 8 || vulnerable > 9 || longTerm < 6 || longTerm > 7) {
    context.addIssue({ code: "custom", message: "invalid_test_type_distribution" });
  }
});

const rawGeneratedPayloadSchema = z.object({
  relationshipNeeds: z.array(z.string().trim().min(2).max(300)).min(5).max(7),
  globalBasis: globalBasisSchema.optional(),
  questions: z.array(storedQuestionSchema).min(25).max(35),
});

export type StoredGeneratedPayload = z.infer<typeof generatedPayloadSchema>;

export function parseGeneratedPayload(content: string): StoredGeneratedPayload {
  const cleaned = content.replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("GENERATED_TEST_JSON_MISSING");
  const raw = rawGeneratedPayloadSchema.parse(JSON.parse(cleaned.slice(start, end + 1)));
  let questions = raw.questions.slice(0, 25).map((question) => ({
    ...question,
    options: question.options.map((option) => ({ ...option })),
  }));

  const typeCounts = questions.reduce<Record<string, number>>((counts, question) => {
    counts[question.testType] = (counts[question.testType] ?? 0) + 1;
    return counts;
  }, {});
  const validDistribution =
    (typeCounts["核心需求满足"] ?? 0) >= 9 && (typeCounts["核心需求满足"] ?? 0) <= 10
    && (typeCounts["脆弱点承接"] ?? 0) >= 8 && (typeCounts["脆弱点承接"] ?? 0) <= 9
    && (typeCounts["长期磨合"] ?? 0) >= 6 && (typeCounts["长期磨合"] ?? 0) <= 7;
  if (!validDistribution) {
    const normalizedTypes = [
      ...Array<string>(10).fill("核心需求满足"),
      ...Array<string>(8).fill("脆弱点承接"),
      ...Array<string>(7).fill("长期磨合"),
    ] as StoredGeneratedPayload["questions"][number]["testType"][];
    questions = questions.map((question, index) => ({ ...question, testType: normalizedTypes[index] }));
  }

  const preferredRiskIndexes = questions
    .map((question, index) => question.riskItem ? index : -1)
    .filter((index) => index >= 0)
    .slice(0, 5);
  for (let index = 0; preferredRiskIndexes.length < 5 && index < questions.length; index += 1) {
    if (!preferredRiskIndexes.includes(index)) preferredRiskIndexes.push(index);
  }
  const riskIndexes = new Set(preferredRiskIndexes);
  questions = questions.map((question, index) => ({ ...question, riskItem: riskIndexes.has(index) }));

  return generatedPayloadSchema.parse({ relationshipNeeds: raw.relationshipNeeds, globalBasis: raw.globalBasis, questions });
}

export function publicQuestions(payload: StoredGeneratedPayload): GeneratedTestQuestion[] {
  return payload.questions.map((question, index) => ({
    id: `generated-${String(index + 1).padStart(2, "0")}`,
    question: question.question,
    eyebrow: question.eyebrow,
    dimension: question.dimension,
    testType: question.testType,
    riskItem: question.riskItem,
    options: question.options.map((option) => ({ label: option.label })),
  }));
}

function verdictFor(correctCount: number, riskWrongCount: number): FormulaTestResult["verdict"] {
  let key: FormulaVerdictKey;
  if (correctCount >= 21) key = "fated";
  else if (correctCount >= 16) key = "likely";
  else if (correctCount >= 11) key = "growing";
  else if (correctCount >= 6) key = "misaligned";
  else key = "not_fated";
  if (key === "fated" && riskWrongCount >= 3) key = "likely";

  return {
    fated: { key, title: "你是 TA 的正缘", summary: "你的多数自然回应都能落到 TA 真正需要的位置，关键时刻也较少踩中关系雷区。" },
    likely: { key, title: "你很可能是 TA 的正缘", summary: riskWrongCount >= 3 ? "整体回应很靠近 TA，但关键风险场景仍会让关系出现明显失速。" : "你们的关系需求大体同频，少数场景仍需要主动调准回应方式。" },
    growing: { key, title: "你们有缘，但还需要磨合", summary: "心动与适配同时存在，但部分自然反应还不能稳定承接 TA 的核心需要。" },
    misaligned: { key, title: "你们更像心动错位", summary: "你并非没有真心，只是你的自然回应常常落在 TA 不容易接收到的位置。" },
    not_fated: { key, title: "你不是 TA 的正缘", summary: "目前这套自然相处方式与 TA 的核心需要存在较大错位，长期互动容易彼此消耗。" },
  }[key];
}

export function evaluateGeneratedTest(
  testId: string,
  starId: string,
  payload: StoredGeneratedPayload,
  answers: number[],
): FormulaTestResult {
  const reviews = payload.questions.map((question, index) => {
    const selectedIndex = answers[index];
    const selected = question.options[selectedIndex];
    const correct = question.options[question.correctIndex];
    return {
      questionId: `generated-${String(index + 1).padStart(2, "0")}`,
      question: question.question,
      testType: question.testType,
      riskItem: question.riskItem,
      selectedOption: selected.label,
      selectedExplanation: selected.explanation,
      correctOption: correct.label,
      correctExplanation: correct.explanation,
      correct: selectedIndex === question.correctIndex,
    };
  });
  const correctCount = reviews.filter((review) => review.correct).length;
  const riskWrongCount = reviews.filter((review) => review.riskItem && !review.correct).length;
  const legacyBasis = payload.questions.find((question) => question.designBasis)?.designBasis;
  return {
    version: 1,
    testId,
    starId,
    total: payload.questions.length,
    correctCount,
    riskWrongCount,
    verdict: verdictFor(correctCount, riskWrongCount),
    basis: payload.globalBasis ?? {
      mbti: legacyBasis?.mbti ?? "本套题结合目标人物的 MBTI 关系需求，重点观察情绪回应、边界感与冲突处理方式。",
      threePillars: legacyBasis?.threePillars ?? "出生日期对应的三柱关系意象仅作为传统文化层面的辅助观察，不构成确定预测。",
      coreConcerns: payload.relationshipNeeds.slice(0, 5),
      summary: "题目通过具体相处情境，观察你的自然回应能否被 TA 接收到，并在长期互动中形成相对健康的循环。",
    },
    reviews,
  };
}
