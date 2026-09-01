import { z } from "zod";
import {
  relationshipRoleDefinitions,
  relationshipRoleIds,
  type FormulaTestResult,
  type GeneratedTestQuestion,
  type LegacyFormulaTestResult,
  type RelationshipIdentityResult,
} from "../../../myfate-generated-test-types";

const optionSchema = z.object({
  label: z.string().trim().min(2).max(300),
  explanation: z.string().trim().min(8).max(800),
});

const globalBasisSchema = z.object({
  mbti: z.string().trim().min(8).max(800),
  threePillars: z.string().trim().min(8).max(800),
  coreConcerns: z.array(z.string().trim().min(2).max(120)).min(3).max(5),
  summary: z.string().trim().min(12).max(1200),
});

const legacyQuestionSchema = z.object({
  question: z.string().trim().min(8).max(500),
  eyebrow: z.string().trim().min(2).max(80).optional().default("专属情境"),
  dimension: z.string().trim().min(2).max(80).optional().default("关系回应"),
  testType: z.enum(["核心需求满足", "脆弱点承接", "长期磨合"]),
  riskItem: z.boolean(),
  correctIndex: z.number().int().min(0).max(3),
  options: z.array(optionSchema).length(4),
});

export const legacyGeneratedPayloadSchema = z.object({
  relationshipNeeds: z.array(z.string().trim().min(2).max(300)).min(5).max(7),
  globalBasis: globalBasisSchema.optional(),
  questions: z.array(legacyQuestionSchema).length(25),
});

const roleIdSchema = z.enum(relationshipRoleIds);
const relationshipOptionSchema = optionSchema.extend({
  primaryRole: roleIdSchema,
  secondaryRole: roleIdSchema,
}).refine((option) => option.primaryRole !== option.secondaryRole, {
  message: "primary_and_secondary_role_must_differ",
});

const relationshipGlobalBasisSchema = z.object({
  mbti: z.string().trim().min(8).max(800),
  threePillars: z.string().trim().min(8).max(800),
  observationFocus: z.array(z.string().trim().min(2).max(120)).min(3).max(6),
  summary: z.string().trim().min(12).max(1200),
});

const relationshipQuestionSchema = z.object({
  question: z.string().trim().min(8).max(500),
  testType: z.enum(["情绪陪伴", "日常相处", "守护成长", "共同体验", "边界冲突"]),
  options: z.array(relationshipOptionSchema).length(4),
}).superRefine((question, context) => {
  const roles = new Set(question.options.map((option) => option.primaryRole));
  if (roles.size !== 4) context.addIssue({ code: "custom", message: "question_primary_roles_must_be_unique" });
});

const relationshipPayloadShape = {
  version: z.literal(2),
  relationshipSignals: z.array(z.string().trim().min(2).max(300)).min(5).max(7),
  globalBasis: relationshipGlobalBasisSchema,
  questions: z.array(relationshipQuestionSchema).length(25),
};

export const relationshipGeneratedPayloadSchema = z.object(relationshipPayloadShape).superRefine((payload, context) => {
  const counts = payload.questions.reduce<Record<string, number>>((result, question) => {
    result[question.testType] = (result[question.testType] ?? 0) + 1;
    return result;
  }, {});
  for (const type of ["情绪陪伴", "日常相处", "守护成长", "共同体验", "边界冲突"]) {
    if (counts[type] !== 5) context.addIssue({ code: "custom", message: `invalid_${type}_count` });
  }
});

const rawRelationshipPayloadSchema = z.object({
  ...relationshipPayloadShape,
  questions: z.array(relationshipQuestionSchema).min(25).max(35),
});

export const storedGeneratedPayloadSchema = z.union([
  relationshipGeneratedPayloadSchema,
  legacyGeneratedPayloadSchema,
]);

export type LegacyGeneratedPayload = z.infer<typeof legacyGeneratedPayloadSchema>;
export type RelationshipGeneratedPayload = z.infer<typeof relationshipGeneratedPayloadSchema>;
export type StoredGeneratedPayload = z.infer<typeof storedGeneratedPayloadSchema>;

function extractJson(content: string) {
  const cleaned = content.replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("GENERATED_TEST_JSON_MISSING");
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
}

export function parseGeneratedPayload(content: string): RelationshipGeneratedPayload {
  const raw = rawRelationshipPayloadSchema.parse(extractJson(content));
  const types = [
    ...Array<string>(5).fill("情绪陪伴"),
    ...Array<string>(5).fill("日常相处"),
    ...Array<string>(5).fill("守护成长"),
    ...Array<string>(5).fill("共同体验"),
    ...Array<string>(5).fill("边界冲突"),
  ] as RelationshipGeneratedPayload["questions"][number]["testType"][];
  const questions = raw.questions.slice(0, 25).map((question, index) => ({
    ...question,
    testType: types[index],
    options: question.options.map((option) => ({ ...option })),
  }));
  return relationshipGeneratedPayloadSchema.parse({ ...raw, questions });
}

export function parseStoredGeneratedPayload(value: unknown): StoredGeneratedPayload {
  return storedGeneratedPayloadSchema.parse(value);
}

export function publicQuestions(payload: StoredGeneratedPayload): GeneratedTestQuestion[] {
  return payload.questions.map((question, index) => ({
    id: `generated-${String(index + 1).padStart(2, "0")}`,
    question: question.question,
    eyebrow: "关系情境",
    dimension: question.testType,
    testType: question.testType,
    riskItem: "riskItem" in question ? question.riskItem : undefined,
    options: question.options.map((option) => ({ label: option.label })),
  }));
}

function legacyVerdict(correctCount: number, riskWrongCount: number): LegacyFormulaTestResult["verdict"] {
  let key: LegacyFormulaTestResult["verdict"]["key"];
  if (correctCount >= 21) key = "fated";
  else if (correctCount >= 16) key = "likely";
  else if (correctCount >= 11) key = "growing";
  else if (correctCount >= 6) key = "misaligned";
  else key = "not_fated";
  if (key === "fated" && riskWrongCount >= 3) key = "likely";
  return {
    fated: { key, title: "你是 TA 的正缘", summary: "你的多数自然回应都能落到 TA 真正需要的位置，关键时刻也较少踩中关系雷区。" },
    likely: { key, title: "你很可能是 TA 的正缘", summary: "你们的关系需求大体同频，少数场景仍需要主动调准回应方式。" },
    growing: { key, title: "你们有缘，但还需要磨合", summary: "心动与适配同时存在，但部分自然反应还不能稳定承接 TA 的核心需要。" },
    misaligned: { key, title: "你们更像心动错位", summary: "你并非没有真心，只是你的自然回应常常落在 TA 不容易接收到的位置。" },
    not_fated: { key, title: "你不是 TA 的正缘", summary: "目前这套自然相处方式与 TA 的核心需要存在较大错位。" },
  }[key];
}

function evaluateLegacyTest(testId: string, starId: string, payload: LegacyGeneratedPayload, answers: number[]): LegacyFormulaTestResult {
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
  return {
    version: 1,
    testId,
    starId,
    total: payload.questions.length,
    correctCount,
    riskWrongCount,
    verdict: legacyVerdict(correctCount, riskWrongCount),
    basis: payload.globalBasis ?? {
      mbti: "本套题结合目标人物的 MBTI 关系需求，重点观察情绪回应、边界感与冲突处理方式。",
      threePillars: "出生日期三柱仅作为传统文化层面的辅助观察，不构成确定预测。",
      coreConcerns: payload.relationshipNeeds.slice(0, 5),
      summary: "这是一份重构前完成的正缘测试历史结果。",
    },
    reviews,
  };
}

function evaluateRelationshipIdentity(testId: string, starId: string, payload: RelationshipGeneratedPayload, answers: number[]): RelationshipIdentityResult {
  const scores = Object.fromEntries(relationshipRoleIds.map((id) => [id, 0])) as Record<typeof relationshipRoleIds[number], number>;
  const reviews = payload.questions.map((question, index) => {
    const selected = question.options[answers[index]];
    scores[selected.primaryRole] += 2;
    scores[selected.secondaryRole] += 1;
    return {
      questionId: `generated-${String(index + 1).padStart(2, "0")}`,
      question: question.question,
      testType: question.testType,
      selectedOption: selected.label,
      explanation: selected.explanation,
      primaryRole: relationshipRoleDefinitions[selected.primaryRole],
      secondaryRole: relationshipRoleDefinitions[selected.secondaryRole],
    };
  });
  const roleRanking = relationshipRoleIds
    .map((id) => ({ ...relationshipRoleDefinitions[id], score: scores[id] }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
  return {
    version: 2,
    testId,
    starId,
    total: payload.questions.length,
    primaryRole: roleRanking[0],
    roleRanking,
    basis: payload.globalBasis,
    reviews,
  };
}

export function evaluateGeneratedTest(
  testId: string,
  starId: string,
  payload: StoredGeneratedPayload,
  answers: number[],
): FormulaTestResult {
  const relationshipPayload = relationshipGeneratedPayloadSchema.safeParse(payload);
  return relationshipPayload.success
    ? evaluateRelationshipIdentity(testId, starId, relationshipPayload.data, answers)
    : evaluateLegacyTest(testId, starId, legacyGeneratedPayloadSchema.parse(payload), answers);
}
