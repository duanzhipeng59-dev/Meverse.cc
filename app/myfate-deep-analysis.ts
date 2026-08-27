import { Solar } from "lunar-javascript";
import { dimensionLabels, type Dimension, type StarProfile } from "./myfate-data";
import { finalVerdict, type AnswerSnapshot, type FateInterpretation, type RelationshipType, type VisualEvidence } from "./myfate-engine";

const dimensions: Dimension[] = ["security", "expression", "independence", "conflict", "novelty"];
const stemElements: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const branchElements: Record<string, string> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火", 午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
const generates: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const controls: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };
const relationshipTraits: Record<string, { strength: string; need: string }> = {
  木: { strength: "推动成长、主动寻找方向", need: "被鼓励，也拥有自主成长的空间" },
  火: { strength: "表达感受、带动关系氛围", need: "获得及时而真诚的情绪回应" },
  土: { strength: "稳定生活节奏、兑现长期承诺", need: "感受到可靠、持续和可预期" },
  金: { strength: "厘清边界、抓住重点并解决问题", need: "得到清楚、坦率和彼此尊重的回应" },
  水: { strength: "感知变化、理解情绪并灵活调整", need: "关系能够流动，不被过度限制" },
};
const harmonyPairs = new Set(["子丑", "寅亥", "卯戌", "辰酉", "巳申", "午未"].map((pair) => [...pair].sort().join("")));
const clashPairs = new Set(["子午", "丑未", "寅申", "卯酉", "辰戌", "巳亥"].map((pair) => [...pair].sort().join("")));
const harmPairs = new Set(["子未", "丑午", "寅巳", "卯辰", "申亥", "酉戌"].map((pair) => [...pair].sort().join("")));
const punishmentPairs = new Set(["子卯", "寅巳", "巳申", "寅申", "丑戌", "戌未", "丑未"].map((pair) => [...pair].sort().join("")));
const threeHarmonyGroups = ["申子辰", "亥卯未", "寅午戌", "巳酉丑"];

export type RelationshipScores = {
  attraction: number;
  support: number;
  daily: number;
  longTerm: number;
};

export type ThreePillarAnalysis = {
  userThreePillars: string;
  starThreePillars: string;
  score: number;
  headline: string;
  insight: string;
  tension: string;
  intimacyScore: number;
  dailyScore: number;
  externalScore: number;
  structureScore: number;
};

function normalizedPair(left: string, right: string) {
  return [left, right].sort().join("");
}

function parsePillars(value: string) {
  const pillars = value.split("·").map((pillar) => pillar.trim()).filter((pillar) => pillar.length >= 2);
  return pillars.length === 3 ? pillars : null;
}

function clamp(score: number, minimum = 42, maximum = 94) {
  return Math.round(Math.min(maximum, Math.max(minimum, score)));
}

function stemRelationScore(leftStem: string, rightStem: string) {
  const left = stemElements[leftStem];
  const right = stemElements[rightStem];
  if (!left || !right) return 68;
  if (left === right) return 80;
  if (generates[left] === right || generates[right] === left) return 88;
  if (controls[left] === right || controls[right] === left) return 58;
  return 70;
}

function branchRelationScore(left: string, right: string) {
  const pair = normalizedPair(left, right);
  if (harmonyPairs.has(pair)) return 91;
  if (clashPairs.has(pair)) return 49;
  if (harmPairs.has(pair)) return 57;
  if (punishmentPairs.has(pair)) return 54;
  if (left === right) return 76;
  const leftElement = branchElements[left];
  const rightElement = branchElements[right];
  if (leftElement && rightElement && (generates[leftElement] === rightElement || generates[rightElement] === leftElement)) return 79;
  return 69;
}

function pillarPairScore(left: string, right: string) {
  return clamp(stemRelationScore(left[0], right[0]) * 0.45 + branchRelationScore(left[1], right[1]) * 0.55);
}

export function birthDateToThreePillars(birthDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  try {
    const lunar = Solar.fromYmd(year, month, day).getLunar();
    return [lunar.getYearInGanZhiExact(), lunar.getMonthInGanZhiExact(), lunar.getDayInGanZhiExact()].join(" · ");
  } catch {
    return null;
  }
}

function relationCopy(userElement: string, starElement: string) {
  const user = relationshipTraits[userElement];
  const star = relationshipTraits[starElement];
  if (userElement === starElement) return {
    headline: "底层节奏相近，容易迅速认出彼此",
    insight: `你和 TA 都习惯${user.strength}，面对亲密关系时有相似的本能语言。优点是理解成本低，风险是两个人也可能同时固守同一种反应。`,
  };
  if (generates[userElement] === starElement) return {
    headline: "你的能量更容易托住 TA",
    insight: `你擅长${user.strength}，能够回应 TA 对${star.need}的需要。你更像关系里的助推者，但长期相处要避免只顾成全 TA，而忽略自己的消耗。`,
  };
  if (generates[starElement] === userElement) return {
    headline: "TA 的节奏容易点亮你",
    insight: `TA 擅长${star.strength}，容易回应你对${user.need}的需要。你会获得被支持、被带动的体验，真正稳定后，也要让这种给予保持双向。`,
  };
  if (controls[userElement] === starElement || controls[starElement] === userElement) return {
    headline: "吸引与拉扯会同时出现",
    insight: `你倾向${user.strength}，TA 更习惯${star.strength}。不同的处理方式会推动彼此改变，也可能放大控制、节奏和边界问题，关键在于把较劲转化为协商。`,
  };
  return {
    headline: "差异能形成互补，但需要翻译",
    insight: `你倾向${user.strength}，TA 更习惯${star.strength}，彼此处理情绪与行动的路径不同。关系不会自动同步，却能在理解差异后形成更完整的配合。`,
  };
}

export function analyzeThreePillars(birthDate: string, starThreePillars: string): ThreePillarAnalysis | null {
  const userThreePillars = birthDateToThreePillars(birthDate);
  if (!userThreePillars) return null;
  const user = parsePillars(userThreePillars);
  const star = parsePillars(starThreePillars);
  if (!user || !star) return null;

  let harmonyCount = 0;
  let clashCount = 0;
  let strainCount = 0;
  const crossScores: number[] = [];
  for (const userPillar of user) {
    for (const starPillar of star) {
      const pair = normalizedPair(userPillar[1], starPillar[1]);
      if (harmonyPairs.has(pair)) harmonyCount += 1;
      if (clashPairs.has(pair)) clashCount += 1;
      if (harmPairs.has(pair) || punishmentPairs.has(pair)) strainCount += 1;
      crossScores.push(branchRelationScore(userPillar[1], starPillar[1]));
    }
  }
  const userElement = stemElements[user[2][0]] ?? branchElements[user[2][1]];
  const starElement = stemElements[star[2][0]] ?? branchElements[star[2][1]];
  if (!userElement || !starElement) return null;
  const relation = relationCopy(userElement, starElement);
  const allBranches = [...user, ...star].map((pillar) => pillar[1]);
  const fullHarmonyGroups = threeHarmonyGroups.filter((group) => [...group].every((branch) => allBranches.includes(branch))).length;
  const intimacyScore = pillarPairScore(user[2], star[2]);
  const dailyScore = pillarPairScore(user[1], star[1]);
  const externalScore = pillarPairScore(user[0], star[0]);
  const structureScore = clamp(
    crossScores.reduce((sum, value) => sum + value, 0) / crossScores.length
      + fullHarmonyGroups * 4
      - strainCount * 1.5,
  );
  const score = clamp(intimacyScore * 0.4 + dailyScore * 0.25 + externalScore * 0.15 + structureScore * 0.2);
  const tension = clashCount + strainCount > harmonyCount + fullHarmonyGroups
    ? `你们的关系结构里有 ${clashCount + strainCount} 处容易发生拉扯的信号，越心动时越要避免用试探和冷处理确认关系。`
    : harmonyCount > 0
      ? `你们的关系结构里有 ${harmonyCount} 处容易自然靠近的信号；仍需用现实行动确认这种舒服能否持续。`
      : "你们之间没有特别强的先天合拍或拉扯信号，关系更依赖日常行为累积，而不是一开始就被固定的宿命感推动。";
  return {
    userThreePillars,
    starThreePillars,
    score,
    headline: relation.headline,
    insight: relation.insight,
    tension,
    intimacyScore,
    dailyScore,
    externalScore,
    structureScore,
  };
}

function mbtiAxisScores(userMbti: string, starMbti: string) {
  if (!/^[IE][NS][TF][JP]$/.test(userMbti) || !/^[IE][NS][TF][JP]$/.test(starMbti)) return null;
  return {
    energy: userMbti[0] === starMbti[0] ? 72 : 78,
    perception: userMbti[1] === starMbti[1] ? 84 : 68,
    decision: userMbti[2] === starMbti[2] ? 76 : 80,
    lifestyle: userMbti[3] === starMbti[3] ? 78 : 72,
  };
}

function relationshipScores(pillars: ThreePillarAnalysis | null, userMbti: string, starMbti: string): RelationshipScores {
  const mbti = mbtiAxisScores(userMbti, starMbti);
  const fallback = pillars?.score ?? 68;
  const axis = mbti ?? { energy: fallback, perception: fallback, decision: fallback, lifestyle: fallback };
  const intimacy = pillars?.intimacyScore ?? Math.round((axis.perception + axis.decision) / 2);
  const daily = pillars?.dailyScore ?? Math.round((axis.energy + axis.lifestyle) / 2);
  const structure = pillars?.structureScore ?? fallback;
  return {
    attraction: clamp(intimacy * 0.6 + axis.perception * 0.2 + axis.decision * 0.2, 0, 100),
    support: clamp(intimacy * 0.45 + axis.decision * 0.4 + axis.energy * 0.15, 0, 100),
    daily: clamp(daily * 0.5 + axis.lifestyle * 0.3 + axis.energy * 0.2, 0, 100),
    longTerm: clamp((pillars?.score ?? fallback) * 0.55 + structure * 0.25 + axis.lifestyle * 0.2, 0, 100),
  };
}

function visualEvidence(
  pillars: ThreePillarAnalysis | null,
  userMbti: string,
  starMbti: string,
  behaviorScores: Record<Dimension, number>,
): VisualEvidence {
  const mbti = mbtiAxisScores(userMbti, starMbti) ?? { energy: 68, perception: 68, decision: 68, lifestyle: 68 };
  const intimacy = pillars?.intimacyScore ?? Math.round((mbti.perception + mbti.decision) / 2);
  const daily = pillars?.dailyScore ?? Math.round((mbti.energy + mbti.lifestyle) / 2);
  const structure = pillars?.structureScore ?? Math.round((mbti.perception + mbti.lifestyle) / 2);
  const expressionBehavior = (behaviorScores.expression + behaviorScores.security) / 2;
  const dimensions = {
    initialAttraction: clamp(intimacy * 0.55 + mbti.perception * 0.25 + mbti.energy * 0.2, 0, 100),
    emotionalConnection: clamp(intimacy * 0.5 + mbti.decision * 0.35 + expressionBehavior * 0.15, 0, 100),
    communicationHarmony: clamp(mbti.perception * 0.35 + mbti.decision * 0.3 + mbti.lifestyle * 0.2 + behaviorScores.conflict * 0.15, 0, 100),
    mutualGrowth: clamp(structure * 0.4 + mbti.decision * 0.25 + intimacy * 0.2 + behaviorScores.novelty * 0.15, 0, 100),
    longTermStability: clamp(daily * 0.35 + structure * 0.25 + mbti.lifestyle * 0.25 + ((behaviorScores.security + behaviorScores.independence) / 2) * 0.15, 0, 100),
    fateImprint: clamp(intimacy * 0.55 + structure * 0.45, 0, 100),
    conflictConsumption: clamp(100 - (structure * 0.4 + intimacy * 0.2 + mbti.decision * 0.15 + behaviorScores.conflict * 0.25), 0, 100),
  };
  const fateDepthScore = clamp(
    dimensions.initialAttraction * 0.15
      + dimensions.emotionalConnection * 0.2
      + dimensions.communicationHarmony * 0.15
      + dimensions.mutualGrowth * 0.15
      + dimensions.longTermStability * 0.2
      + dimensions.fateImprint * 0.15,
    0,
    100,
  );
  const conflictPenalty = Math.min(14, Math.max(0, (dimensions.conflictConsumption - 45) * 0.25));
  const longTermMatchScore = clamp(
    dimensions.initialAttraction * 0.15
      + dimensions.emotionalConnection * 0.2
      + dimensions.communicationHarmony * 0.2
      + dimensions.mutualGrowth * 0.15
      + dimensions.longTermStability * 0.3
      - conflictPenalty,
    0,
    100,
  );
  const relationshipType: RelationshipType = fateDepthScore >= 70
    ? longTermMatchScore >= 70 ? "稳定深缘型" : "宿命拉扯型"
    : longTermMatchScore >= 70 ? "舒适陪伴型" : "短暂心动型";
  return {
    fateDepthScore,
    longTermMatchScore,
    conflictConsumptionScore: dimensions.conflictConsumption,
    relationshipType,
    dimensions,
  };
}

function mbtiInsight(userMbti: string, starMbti: string) {
  if (!/^[IE][NS][TF][JP]$/.test(userMbti) || !/^[IE][NS][TF][JP]$/.test(starMbti)) return "";
  const shared: string[] = [];
  const different: string[] = [];
  const axisCopy = [
    ["能量补给", "一个更需要向外连接，一个更依赖独处恢复"],
    ["理解世界", "一个关注可能性，一个更相信具体经验"],
    ["做决定", "一个先照顾感受，一个先确认逻辑"],
    ["生活节奏", "一个偏确定规划，一个偏开放探索"],
  ];
  axisCopy.forEach(([label, tension], index) => {
    if (userMbti[index] === starMbti[index]) shared.push(label);
    else different.push(tension);
  });
  const sharedCopy = shared.length ? `你们在${shared.join("、")}上更容易形成默认默契。` : "你们的四个偏好轴都不相同，吸引更多来自互补和新鲜感。";
  const differenceCopy = different.length ? `需要翻译的地方是：${different.slice(0, 2).join("；")}。` : "四个偏好轴高度一致，但要留意彼此同时回避相同问题。";
  return `${sharedCopy}${differenceCopy}`;
}

function behaviorInsight(scores: Record<Dimension, number>, answers: AnswerSnapshot[]) {
  const ranked = [...dimensions].sort((left, right) => scores[right] - scores[left]);
  const strongest = ranked[0];
  const weakest = ranked.at(-1) ?? "security";
  const evidence = answers[0];
  const evidenceCopy = evidence ? `例如在“${evidence.question}”里，你选择了“${evidence.answer}”，` : "从这次连续选择来看，";
  return `${evidenceCopy}说明你的${dimensionLabels[strongest]}是这段关系最可靠的资源；而${dimensionLabels[weakest]}得分相对较低，压力出现时更容易成为误会入口。`;
}

export function createDeepInterpretation({
  star,
  score,
  answers,
  behaviorScores,
  userMbti,
  birthDate,
  base,
}: {
  star: StarProfile;
  score: number;
  answers: AnswerSnapshot[];
  behaviorScores: Record<Dimension, number>;
  userMbti: string;
  birthDate: string;
  base: FateInterpretation;
}): FateInterpretation {
  const pillars = analyzeThreePillars(birthDate, star.threePillars);
  const ranked = [...dimensions].sort((left, right) => behaviorScores[right] - behaviorScores[left]);
  const strongest = ranked[0];
  const weakest = ranked.at(-1) ?? "security";
  const verdict = finalVerdict(score);
  const mbti = mbtiInsight(userMbti, star.mbti);
  const pillarText = pillars ? `${pillars.headline}。${pillars.insight}${pillars.tension}` : "";
  const scores = relationshipScores(pillars, userMbti, star.mbti);
  const evidence = visualEvidence(pillars, userMbti, star.mbti, behaviorScores);
  const expressionStyle = behaviorScores.expression >= 68 ? "愿意把在意说出来" : "更习惯先观察，再确认是否表达";
  const spaceStyle = behaviorScores.independence >= 68 ? "能在靠近时保留彼此空间" : "容易把持续联系当成确定感";
  const repairStyle = behaviorScores.conflict >= 68 ? "出现分歧后仍愿意回到问题本身" : "压力出现时更容易沉默、试探或急着得到答案";
  return {
    ...base,
    mbtiInsight: mbti,
    behaviorInsight: behaviorInsight(behaviorScores, answers),
    pillarInsight: pillarText,
    userThreePillars: pillars?.userThreePillars ?? "",
    pillarMatchScore: pillars?.score,
    relationshipScores: scores,
    visualEvidence: evidence,
    coreAttraction: pillars
      ? `${pillars.headline}。你们的吸引不是单靠相似，而是一个人的自然反应能够接上另一个人的需要。人格偏好进一步决定你们是迅速理解彼此，还是先被差异吸引、再慢慢建立默契。`
      : `你们在理解信息和表达在意的方式上形成了独特吸引：熟悉感让靠近变得自然，差异则让彼此保持好奇。`,
    supportPattern: `${pillars?.insight ?? mbti}落实到关系里，你更可能用${dimensionLabels[strongest]}托住 TA。你${expressionStyle}，这会决定 TA 感受到的是清晰支持，还是需要猜测的关心。`,
    dailyCompatibility: `真正一起生活时，重点不只是心动，而是计划、独处和临时变化如何被安排。你${spaceStyle}；${scores.daily >= 76 ? "双方较容易找到不费力的共同节奏。" : "双方需要提前说清联系频率与各自的生活边界。"}`,
    intimacyRhythm: `${mbti || "你们对靠近的自然反应并不完全相同。"}${behaviorScores.security >= 68 ? "你能用持续回应增加关系的确定感。" : "当回应变少时，你可能先感到不安，需要避免用试探代替确认。"}`,
    conflictCycle: `${pillars?.tension ?? "关系里的差异需要通过现实互动被看见。"}你在压力下${repairStyle}。这决定一次误解会成为更理解彼此的入口，还是演变成反复发生的旧问题。`,
    longTermPotential: `${verdict}对应的是你们当前的长期适配潜力。${scores.longTerm >= 76 ? `你的${dimensionLabels[strongest]}能够补上 TA 在关系里的需要，双方有机会把心动变成稳定配合。` : `吸引可以发生，但${dimensionLabels[weakest]}上的差异会持续消耗关系，需要清晰约定而不是依赖默契。`}`,
    relationshipDynamic: `三柱关系与人格互动决定你们为什么靠近、能否互相托举；行为答案只校准这种潜力是否能在现实中稳定出现。你在${dimensionLabels[strongest]}上的表现会推动关系，${dimensionLabels[weakest]}则是最需要留意的现实变量。`,
    actionPlan: [
      `把${dimensionLabels[strongest]}变成稳定动作：每次重要互动后，给出一次清晰回应。`,
      `当${dimensionLabels[weakest]}触发不安时，先说事实和需要，不用冷淡或试探代替确认。`,
      `为你和 ${star.name} 设计一个可持续节奏：既保留心动，也保留各自恢复能量的空间。`,
    ],
  };
}
