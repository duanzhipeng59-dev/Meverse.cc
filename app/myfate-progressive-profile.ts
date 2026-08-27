import type { Dimension, StarProfile, TestQuestion } from "./myfate-data";
import { analyzeThreePillars } from "./myfate-deep-analysis";

export const behaviorDimensions: Dimension[] = ["security", "expression", "independence", "conflict", "novelty"];

export const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

export function validMbti(value: string) {
  return MBTI_TYPES.includes(value as (typeof MBTI_TYPES)[number]);
}

export function validBirthDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= new Date().toISOString().slice(0, 10);
}

export type LocalBasicProfile = {
  nickname: string;
  birthDate: string;
  mbti: string;
};

export type ProgressiveDimension = {
  score: number;
  confidence: number;
  samples: number;
};

export type ProgressiveProfile = {
  version: 1;
  completedTests: number;
  dimensions: Record<Dimension, ProgressiveDimension>;
  testedCelebrityIds: string[];
  seenSceneFamilies: string[];
  seenQuestionCounts: Record<string, number>;
  updatedAt: string;
};

export type ProgressiveCompatibility = {
  score: number;
  behaviorScore: number;
  behaviorAdjustment: number;
  mbtiScore: number | null;
  pillarScore: number | null;
  dimensionScores: Record<Dimension, number>;
};

function basicProfileKey(email: string | null) {
  return `myfate-profile:${email ?? "guest"}`;
}

function progressiveProfileKey(email: string | null) {
  return `myfate-progressive-profile:v1:${email ?? "guest"}`;
}

function emptyDimensions(): Record<Dimension, ProgressiveDimension> {
  return Object.fromEntries(behaviorDimensions.map((dimension) => [dimension, { score: 50, confidence: 0, samples: 0 }])) as Record<Dimension, ProgressiveDimension>;
}

export function emptyProgressiveProfile(): ProgressiveProfile {
  return {
    version: 1,
    completedTests: 0,
    dimensions: emptyDimensions(),
    testedCelebrityIds: [],
    seenSceneFamilies: [],
    seenQuestionCounts: {},
    updatedAt: new Date(0).toISOString(),
  };
}

export function readBasicProfile(email: string | null): LocalBasicProfile {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(basicProfileKey(email)) ?? "{}") as Partial<LocalBasicProfile>;
    return {
      nickname: typeof parsed.nickname === "string" ? parsed.nickname.slice(0, 20) : "",
      birthDate: typeof parsed.birthDate === "string" ? parsed.birthDate : "",
      mbti: typeof parsed.mbti === "string" ? parsed.mbti.toUpperCase() : "",
    };
  } catch {
    return { nickname: "", birthDate: "", mbti: "" };
  }
}

export function writeBasicProfile(email: string | null, profile: LocalBasicProfile) {
  window.localStorage.setItem(basicProfileKey(email), JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("myfate-profile-updated"));
}

function isProgressiveDimension(value: unknown): value is ProgressiveDimension {
  if (typeof value !== "object" || value === null) return false;
  const dimension = value as ProgressiveDimension;
  return Number.isFinite(dimension.score) && Number.isFinite(dimension.confidence) && Number.isFinite(dimension.samples);
}

export function readProgressiveProfile(email: string | null): ProgressiveProfile {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(progressiveProfileKey(email)) ?? "null") as Partial<ProgressiveProfile> | null;
    if (!parsed || parsed.version !== 1 || !parsed.dimensions) return emptyProgressiveProfile();
    const dimensions = emptyDimensions();
    for (const dimension of behaviorDimensions) {
      if (isProgressiveDimension(parsed.dimensions[dimension])) dimensions[dimension] = parsed.dimensions[dimension];
    }
    return {
      version: 1,
      completedTests: Number.isInteger(parsed.completedTests) && (parsed.completedTests ?? 0) >= 0 ? parsed.completedTests ?? 0 : 0,
      dimensions,
      testedCelebrityIds: Array.isArray(parsed.testedCelebrityIds) ? parsed.testedCelebrityIds.filter((id): id is string => typeof id === "string") : [],
      seenSceneFamilies: Array.isArray(parsed.seenSceneFamilies) ? parsed.seenSceneFamilies.filter((id): id is string => typeof id === "string") : [],
      seenQuestionCounts: typeof parsed.seenQuestionCounts === "object" && parsed.seenQuestionCounts !== null ? parsed.seenQuestionCounts : {},
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    return emptyProgressiveProfile();
  }
}

function writeProgressiveProfile(email: string | null, profile: ProgressiveProfile) {
  window.localStorage.setItem(progressiveProfileKey(email), JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent("myfate-progressive-profile-updated"));
}

function averageConfidence(profile: ProgressiveProfile) {
  return behaviorDimensions.reduce((sum, dimension) => sum + profile.dimensions[dimension].confidence, 0) / behaviorDimensions.length;
}

function clampScore(score: number) {
  return Math.round(Math.min(100, Math.max(0, score)));
}

function dimensionMatch(scores: Record<Dimension, number>, star: StarProfile) {
  const distance = behaviorDimensions.reduce((sum, dimension) => sum + Math.abs(scores[dimension] - star.ideal[dimension]), 0) / behaviorDimensions.length;
  return clampScore(100 - distance);
}

export function mbtiCompatibility(userMbti: string, starMbti: string) {
  if (!/^[IE][NS][TF][JP]$/.test(userMbti) || !/^[IE][NS][TF][JP]$/.test(starMbti)) return null;
  const scores = [
    userMbti[0] === starMbti[0] ? 72 : 78,
    userMbti[1] === starMbti[1] ? 84 : 68,
    userMbti[2] === starMbti[2] ? 76 : 80,
    userMbti[3] === starMbti[3] ? 78 : 72,
  ];
  const weights = [0.2, 0.3, 0.25, 0.25];
  return Math.round(scores.reduce((sum, score, index) => sum + score * weights[index], 0));
}

export function profileCompatibilityScore(userMbti: string, birthDate: string, star: StarProfile) {
  const mbtiScore = mbtiCompatibility(userMbti, star.mbti);
  const pillarScore = analyzeThreePillars(birthDate, star.threePillars)?.score ?? null;
  if (mbtiScore !== null && pillarScore !== null) return clampScore(pillarScore * 0.55 + mbtiScore * 0.45);
  return pillarScore ?? mbtiScore ?? 50;
}

export function calculateProgressiveCompatibility({
  currentScore,
  currentDimensions,
  profile,
  userMbti,
  birthDate,
  star,
}: {
  currentScore: number;
  currentDimensions: Record<Dimension, number>;
  profile: ProgressiveProfile;
  userMbti: string;
  birthDate: string;
  star: StarProfile;
}): ProgressiveCompatibility {
  const currentFit = dimensionMatch(currentDimensions, star);
  const currentBehaviorScore = currentScore * 0.65 + currentFit * 0.35;
  const mbtiScore = mbtiCompatibility(userMbti, star.mbti);
  const historicalScores = Object.fromEntries(behaviorDimensions.map((dimension) => [dimension, profile.dimensions[dimension].score])) as Record<Dimension, number>;
  const historyScore = dimensionMatch(historicalScores, star);
  const historyBlend = profile.completedTests > 0 ? Math.min(0.35, averageConfidence(profile) * 0.35) : 0;
  const behaviorScore = currentBehaviorScore * (1 - historyBlend) + historyScore * historyBlend;
  const behaviorAdjustment = Math.round(Math.min(8, Math.max(-8, (behaviorScore - 50) * 0.16)));
  const pillarScore = analyzeThreePillars(birthDate, star.threePillars)?.score ?? null;

  // 三柱与 MBTI 决定基础缘分；行为只允许在基础分上做有限校准。
  const primaryScore = pillarScore !== null && mbtiScore !== null
    ? pillarScore * 0.55 + mbtiScore * 0.45
    : pillarScore ?? mbtiScore;
  const score = clampScore(primaryScore === null ? behaviorScore : primaryScore + behaviorAdjustment);

  const dimensionScores = Object.fromEntries(behaviorDimensions.map((dimension) => {
    const historyBlend = profile.completedTests > 0 ? Math.min(0.35, profile.dimensions[dimension].confidence * 0.35) : 0;
    return [dimension, clampScore(currentDimensions[dimension] * (1 - historyBlend) + profile.dimensions[dimension].score * historyBlend)];
  })) as Record<Dimension, number>;

  return {
    score,
    behaviorScore: clampScore(behaviorScore),
    behaviorAdjustment,
    mbtiScore,
    pillarScore,
    dimensionScores,
  };
}

export function recordProgressiveTest({
  email,
  profile,
  starId,
  questions,
  sessionScores,
}: {
  email: string | null;
  profile: ProgressiveProfile;
  starId: string;
  questions: TestQuestion[];
  sessionScores: Record<Dimension, number>;
}) {
  const dimensions = { ...profile.dimensions };
  for (const dimension of behaviorDimensions) {
    const previous = profile.dimensions[dimension];
    const addedSamples = questions.filter((question) => question.dimension === dimension).length;
    if (addedSamples === 0) continue;
    const samples = previous.samples + addedSamples;
    const score = clampScore((previous.score * previous.samples + sessionScores[dimension] * addedSamples) / samples);
    dimensions[dimension] = {
      score,
      samples,
      confidence: Math.min(0.95, 1 - Math.exp(-samples / 9)),
    };
  }

  const seenQuestionCounts = { ...profile.seenQuestionCounts };
  for (const question of questions) seenQuestionCounts[question.id] = (seenQuestionCounts[question.id] ?? 0) + 1;
  const seenSceneFamilies = Array.from(new Set([...profile.seenSceneFamilies, ...questions.map((question) => question.id)]));
  const testedCelebrityIds = Array.from(new Set([...profile.testedCelebrityIds, starId]));
  const next: ProgressiveProfile = {
    version: 1,
    completedTests: profile.completedTests + 1,
    dimensions,
    testedCelebrityIds,
    seenSceneFamilies,
    seenQuestionCounts,
    updatedAt: new Date().toISOString(),
  };
  writeProgressiveProfile(email, next);
  return next;
}
