import { dimensionLabels, type Dimension, type StarProfile, type TestQuestion } from "./myfate-data";

export type AnswerSnapshot = {
  question: string;
  answer: string;
  value: number;
  dimension: Dimension;
};

export type FateVerdict = "绝对" | "可能" | "也许" | "不太像" | "不是";
export type RelationshipType = "稳定深缘型" | "宿命拉扯型" | "舒适陪伴型" | "短暂心动型";

export type VisualEvidence = {
  fateDepthScore: number;
  longTermMatchScore: number;
  conflictConsumptionScore: number;
  relationshipType: RelationshipType;
  dimensions: {
    initialAttraction: number;
    emotionalConnection: number;
    communicationHarmony: number;
    mutualGrowth: number;
    longTermStability: number;
    fateImprint: number;
    conflictConsumption: number;
  };
};

export type FateInterpretation = {
  headline: string;
  summary: string;
  attraction: string;
  friction: string;
  advice: string;
  mbtiInsight?: string;
  behaviorInsight?: string;
  pillarInsight?: string;
  userThreePillars?: string;
  pillarMatchScore?: number;
  relationshipScores?: {
    attraction: number;
    support: number;
    daily: number;
    longTerm: number;
  };
  visualEvidence?: VisualEvidence;
  coreAttraction?: string;
  supportPattern?: string;
  dailyCompatibility?: string;
  intimacyRhythm?: string;
  conflictCycle?: string;
  longTermPotential?: string;
  relationshipDynamic?: string;
  actionPlan?: string[];
};

const dimensions: Dimension[] = ["security", "expression", "independence", "conflict", "novelty"];

export function scoreAnswers(answers: Record<string, number>, questionCount: number) {
  const total = Object.values(answers).reduce((sum, value) => sum + value, 0);
  return Math.round((total / Math.max(questionCount * 4, 1)) * 100);
}

export function initialVerdict(score: number) {
  if (score >= 82) return "你和 TA 的缘分貌似很强";
  if (score >= 58) return "你和 TA 的缘分需要加强";
  return "你和 TA 的缘分貌似很浅";
}

export function finalCompatibility(initialScore: number, adaptiveScore: number) {
  return Math.round(initialScore * 0.35 + adaptiveScore * 0.65);
}

export function finalVerdict(score: number): FateVerdict {
  if (score >= 90) return "绝对";
  if (score >= 80) return "可能";
  if (score >= 68) return "也许";
  if (score >= 55) return "不太像";
  return "不是";
}

export function presentationMbtiInsight(value: string) {
  return value.replace(/^[A-Z]{4}\s*(?:与|和|×)\s*[A-Z]{4}(?:\s*的组合(?:里|中))?[，,:：\s]*/u, "");
}

export function presentationPillarInsight(value: string) {
  return value
    .replace(/你与 TA 的日主都落在[木火土金水][，,]面对亲密关系时/gu, "你与 TA 面对亲密关系时")
    .replace(/你的[木火土金水]性(?:能量|倾向|需要)?/gu, "你")
    .replace(/TA 的[木火土金水]性(?:能量|倾向|需要)?/gu, "TA")
    .replace(/[木火土金水]与[木火土金水]之间/gu, "你们不同的处理方式之间")
    .replace(/你偏[木火土金水]、TA 偏[木火土金水]/gu, "你与 TA 的反应路径不同")
    .replace(/自然生发/gu, "自然带动")
    .replace(/生发/gu, "带动");
}

export function dimensionScores(answers: AnswerSnapshot[]) {
  return Object.fromEntries(dimensions.map((dimension) => {
    const values = answers.filter((answer) => answer.dimension === dimension).map((answer) => answer.value);
    const score = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / (values.length * 4) * 100) : 0;
    return [dimension, score];
  })) as Record<Dimension, number>;
}

export function createFallbackAdaptiveQuestions(star: StarProfile, initialScore: number): TestQuestion[] {
  const tone = initialScore >= 82 ? "验证你们的深层默契" : initialScore >= 58 ? "找到需要靠近的部分" : "辨认真正的关系边界";
  return [
    {
      id: "adaptive-unspoken",
      dimension: "expression",
      eyebrow: tone,
      question: `${star.name}连续几天回复都很简短，却说自己只是太累。你会如何判断什么时候该靠近？`,
      options: [
        { label: "立刻追问到底发生了什么", value: 1 },
        { label: "不再联系，等 TA 完全恢复", value: 2 },
        { label: "先表达关心，观察 TA 是否愿意继续说", value: 3 },
        { label: "说明我注意到了变化，并让 TA 自己选择陪伴方式", value: 4 },
      ],
    },
    {
      id: "adaptive-sacrifice",
      dimension: "independence",
      eyebrow: `关于${star.name}的自主空间`,
      question: `${star.name}得到一个重要机会，但这意味着你们很长时间无法见面。你会怎么谈这件事？`,
      options: [
        { label: "让 TA 在机会和关系之间选一个", value: 1 },
        { label: "嘴上支持，心里等待 TA 主动补偿", value: 2 },
        { label: "支持选择，同时提出我真实的不安", value: 3 },
        { label: "共同设计远距离节奏，并保留彼此独立成长的空间", value: 4 },
      ],
    },
    {
      id: "adaptive-repair",
      dimension: "conflict",
      eyebrow: "一次真正的关系修复",
      question: `争执后，${star.name}需要时间想清楚，而你希望马上解决。你最可能怎么做？`,
      options: [
        { label: "继续谈到当场解决为止", value: 1 },
        { label: "彻底冷处理，看谁先低头", value: 2 },
        { label: "先暂停，但要求 TA 当天给答复", value: 3 },
        { label: "约定重新沟通的时间，也分别整理真正的需求", value: 4 },
      ],
    },
    {
      id: "adaptive-visibility",
      dimension: "security",
      eyebrow: "安全感与现实压力",
      question: `外界开始猜测你们的关系，${star.name}承受了明显压力。你会把什么放在第一位？`,
      options: [
        { label: "让所有人知道事实，停止猜测", value: 1 },
        { label: "完全听 TA 的，我不表达意见", value: 2 },
        { label: "先保护隐私，再讨论彼此需要的确定感", value: 4 },
        { label: "减少接触，等风波自己过去", value: 3 },
      ],
    },
    {
      id: "adaptive-rhythm",
      dimension: "novelty",
      eyebrow: `进入“${star.relationshipStyle}”`,
      question: `当热烈期过去，${star.name}更想用稳定日常维持关系，你会如何回应？`,
      options: [
        { label: "认为没有惊喜就是不爱了", value: 1 },
        { label: "接受日常，但希望 TA 负责制造变化", value: 2 },
        { label: "一起保留仪式感，也允许关系自然安静", value: 4 },
        { label: "偶尔提出新体验，观察 TA 的反馈", value: 3 },
      ],
    },
    {
      id: "adaptive-values",
      dimension: "security",
      eyebrow: "最难回避的长期选择",
      question: `如果你和${star.name}很相爱，但对未来生活方式有明显分歧，你会？`,
      options: [
        { label: "相信爱能解决一切，不必现在讨论", value: 2 },
        { label: "要求其中一方彻底改变", value: 1 },
        { label: "先找共同底线，再判断差异是否真的能共存", value: 4 },
        { label: "暂时各退一步，以后再决定", value: 3 },
      ],
    },
    {
      id: "adaptive-listening",
      dimension: "expression",
      eyebrow: "分清安慰与解决问题",
      question: `${star.name}向你讲起一件很挫败的事，但暂时不想听任何建议。你会怎么陪 TA？`,
      options: [
        { label: "还是给出方案，解决问题最重要", value: 1 },
        { label: "不知道说什么，于是转换话题", value: 2 },
        { label: "先听完，再确认 TA 是否需要我的想法", value: 4 },
        { label: "表达理解，等 TA 主动继续讲", value: 3 },
      ],
    },
    {
      id: "adaptive-privacy",
      dimension: "independence",
      eyebrow: "亲密不等于没有隐私",
      question: `你无意间看到${star.name}没有锁屏的私人聊天界面，你最真实的反应是？`,
      options: [
        { label: "顺便看一下，亲密关系不该有秘密", value: 1 },
        { label: "立刻移开视线，也不把这件事当作试探", value: 4 },
        { label: "不看，但之后旁敲侧击询问内容", value: 2 },
        { label: "告诉 TA 我看到了界面，但没有继续阅读", value: 3 },
      ],
    },
    {
      id: "adaptive-pattern",
      dimension: "conflict",
      eyebrow: "同一个问题再次发生",
      question: `${star.name}又一次出现你们曾经讨论过的问题，你会怎么判断这段关系还能不能修复？`,
      options: [
        { label: "翻出以前所有问题，证明 TA 从没改变", value: 1 },
        { label: "继续忍耐，相信时间久了自然会好", value: 2 },
        { label: "先看这次是否有新的原因，再表达失望", value: 3 },
        { label: "讨论行为模式、改进期限和彼此不能退让的底线", value: 4 },
      ],
    },
    {
      id: "adaptive-relocation",
      dimension: "novelty",
      eyebrow: "机会与共同生活",
      question: `${star.name}获得一个需要长期搬去陌生城市的机会，你会如何参与这个决定？`,
      options: [
        { label: "要求 TA 为关系放弃机会", value: 1 },
        { label: "马上决定跟随，不考虑自己的生活", value: 2 },
        { label: "分别列出现实代价，再寻找阶段性方案", value: 4 },
        { label: "先支持 TA，再慢慢思考自己的选择", value: 3 },
      ],
    },
    {
      id: "adaptive-consistency",
      dimension: "security",
      eyebrow: "热情之后的确定感",
      question: `${star.name}最近依然关心你，但联系频率不再像最初那么高。什么最能帮助你判断关系是否稳定？`,
      options: [
        { label: "每天消息数量是否保持不变", value: 1 },
        { label: "TA 是否愿意公开表达关系", value: 2 },
        { label: "重要时刻是否出现，并持续兑现约定", value: 4 },
        { label: "我不主动时，TA 会不会立刻发现", value: 3 },
      ],
    },
    {
      id: "adaptive-affection",
      dimension: "expression",
      eyebrow: "不同的情感表达频率",
      question: `你希望经常表达喜欢，而${star.name}更习惯在重要时刻才说出口。你会？`,
      options: [
        { label: "要求 TA 按照我的频率表达", value: 1 },
        { label: "压下需要，告诉自己不要太敏感", value: 2 },
        { label: "说明哪些回应对我重要，也了解 TA 舒服的方式", value: 4 },
        { label: "先观察 TA 的行动，再决定是否需要谈", value: 3 },
      ],
    },
  ];
}

export function createFallbackInterpretation(
  star: StarProfile,
  score: number,
  verdict: FateVerdict,
  answers: AnswerSnapshot[],
): FateInterpretation {
  const scores = dimensionScores(answers);
  const ranked = [...dimensions].sort((a, b) => scores[b] - scores[a]);
  const strongest = ranked[0];
  const weakest = ranked.at(-1) ?? "security";
  return {
    headline: `${verdict}，你们是否是正缘已经有了答案`,
    summary: `你的选择显示，你并不只是在想象${star.name}，而是在回应一个具有“${star.relationshipStyle}”特征的真实关系情境。${score >= 68 ? "你有能力理解 TA 的节奏，也愿意在重要节点给出行动。" : "吸引力存在，但遇到压力时，你们对靠近与退后的理解仍可能不同。"}`,
    attraction: `你在${dimensionLabels[strongest]}上的回答最稳定，这恰好能回应${star.name}看重的“${star.focus}”。这种匹配更像长期相处中的舒服，而不是一时的心动。`,
    friction: `${dimensionLabels[weakest]}是目前最容易出现误读的地方。真正进入关系后，含糊地等待对方理解，可能会把小分歧放大。`,
    advice: `保留你真实的反应，但在关键时刻多问一句“你现在希望我怎么陪你”。对你和${star.name}来说，清楚而不逼迫的沟通，比猜中答案更重要。`,
    behaviorInsight: `你在${dimensionLabels[strongest]}上的回应最稳定，而${dimensionLabels[weakest]}更容易在压力下出现误读。真正决定关系走向的，不是一次高分选择，而是这种回应能否持续出现。`,
    relationshipDynamic: `这段关系的吸引来自彼此节奏被看见，能否长期靠近则取决于你们是否愿意把默契变成清晰、稳定、可重复的行动。`,
    actionPlan: [
      `继续发挥${dimensionLabels[strongest]}上的稳定回应。`,
      `在${dimensionLabels[weakest]}触发不安时，用直接表达代替猜测。`,
      `给彼此留出可持续的靠近节奏，不用一时热烈证明全部关系。`,
    ],
  };
}
