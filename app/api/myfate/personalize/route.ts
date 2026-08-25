import { z } from "zod";
import { getStar } from "../../../myfate-data";
import { createDeepInterpretation } from "../../../myfate-deep-analysis";
import {
  createFallbackInterpretation,
  finalVerdict,
} from "../../../myfate-engine";
import { generateReportJson } from "./model-provider";
import { buildMyfateReportPrompt, MYFATE_REPORT_SYSTEM_PROMPT } from "./report-prompt";

const dimensionSchema = z.enum(["security", "expression", "independence", "conflict", "novelty"]);
const answerSchema = z.object({
  question: z.string(),
  answer: z.string(),
  value: z.number().int().min(1).max(4),
  dimension: dimensionSchema,
});
const behaviorScoresSchema = z.object({
  security: z.number().min(0).max(100),
  expression: z.number().min(0).max(100),
  independence: z.number().min(0).max(100),
  conflict: z.number().min(0).max(100),
  novelty: z.number().min(0).max(100),
});
const requestSchema = z.object({
  action: z.literal("interpretation"),
  starId: z.string(),
  initialScore: z.number().min(0).max(100),
  finalScore: z.number().min(0).max(100).optional(),
  answers: z.array(answerSchema).max(32),
  behaviorScores: behaviorScoresSchema.optional(),
  userMbti: z.string().max(4).optional().default(""),
  birthDate: z.string().max(10).optional().default(""),
});

const modelInterpretationSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  attraction: z.string(),
  friction: z.string(),
  advice: z.string(),
  mbtiInsight: z.string(),
  behaviorInsight: z.string(),
  pillarInsight: z.string(),
  coreAttraction: z.string(),
  supportPattern: z.string(),
  dailyCompatibility: z.string(),
  intimacyRhythm: z.string(),
  conflictCycle: z.string(),
  longTermPotential: z.string(),
  relationshipDynamic: z.string(),
  actionPlan: z.array(z.string()).min(3).max(3),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

  const { starId, initialScore, finalScore, answers, behaviorScores, userMbti, birthDate } = parsed.data;
  const star = getStar(starId);
  if (!star) return Response.json({ error: "STAR_NOT_FOUND" }, { status: 404 });

  const score = finalScore ?? initialScore;
  const fallbackBase = createFallbackInterpretation(star, score, finalVerdict(score), answers);
  const resolvedBehaviorScores = behaviorScores ?? Object.fromEntries(
    ["security", "expression", "independence", "conflict", "novelty"].map((dimension) => {
      const values = answers.filter((answer) => answer.dimension === dimension).map((answer) => answer.value);
      return [dimension, values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / (values.length * 4) * 100) : 0];
    }),
  ) as NonNullable<typeof behaviorScores>;
  const deepFallback = createDeepInterpretation({
    star,
    score,
    answers,
    behaviorScores: resolvedBehaviorScores,
    userMbti,
    birthDate,
    base: fallbackBase,
  });
  if (!process.env.DEEPSEEK_API_KEY) {
    return Response.json({ error: "MODEL_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const verdict = finalVerdict(score);
    const prompt = buildMyfateReportPrompt({
      starProfile: {
        name: star.name,
        mbti: star.mbti,
        birthDate: star.birthDate,
        threePillars: star.threePillars,
        traits: star.traits,
        emotionalProfile: star.description,
        relationshipStyle: star.relationshipStyle,
        focus: star.focus,
      },
      userProfile: {
        mbti: userMbti || "未填写",
        birthDate: birthDate || "未填写",
        threePillars: deepFallback.userThreePillars || "未生成",
      },
      formulaEvidence: deepFallback.visualEvidence,
      analysisDraft: {
        initialAttraction: deepFallback.coreAttraction,
        emotionalConnection: deepFallback.intimacyRhythm,
        communicationHarmony: deepFallback.mbtiInsight,
        mutualGrowth: deepFallback.supportPattern,
        longTermStability: deepFallback.longTermPotential,
        fateImprint: deepFallback.pillarInsight,
        conflictConsumption: deepFallback.conflictCycle,
      },
      behaviorScores: resolvedBehaviorScores,
      answers,
      score,
      verdict,
    });
    const generation = await generateReportJson(MYFATE_REPORT_SYSTEM_PROMPT, prompt);
    const modelOutput = modelInterpretationSchema.parse(JSON.parse(generation.content));
    return Response.json({
      interpretation: { ...deepFallback, ...modelOutput },
      source: generation.provider,
      model: generation.model,
    });
  } catch (error) {
    console.error("Myfate personalization failed", error);
    return Response.json({ error: "MODEL_GENERATION_FAILED" }, { status: 502 });
  }
}
