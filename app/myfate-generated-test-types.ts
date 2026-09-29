export const relationshipRoleIds = [
  "romantic_partner",
  "soulmate",
  "older_brother",
  "older_sister",
  "younger_brother",
  "younger_sister",
  "father",
  "mother",
  "bestie",
  "brotherhood",
  "close_friend",
  "casual_friend",
  "teammate",
  "mentor",
  "playmate",
  "rival",
] as const;

export type RelationshipRoleId = typeof relationshipRoleIds[number];

export type RelationshipRoleDefinition = {
  id: RelationshipRoleId;
  label: string;
  shortLabel: string;
  category: "亲密关系" | "家人角色" | "朋友关系" | "同行关系" | "成长关系";
  summary: string;
};

export const relationshipRoleDefinitions: Record<RelationshipRoleId, RelationshipRoleDefinition> = {
  romantic_partner: { id: "romantic_partner", label: "恋人型伴侣", shortLabel: "恋人", category: "亲密关系", summary: "你更自然地把心动、承诺与双向亲密放在关系中心。" },
  soulmate: { id: "soulmate", label: "灵魂知己", shortLabel: "知己", category: "亲密关系", summary: "你擅长理解未说出口的部分，用深度共鸣建立连接。" },
  older_brother: { id: "older_brother", label: "哥哥型守护者", shortLabel: "哥哥", category: "家人角色", summary: "你倾向用稳定、行动和清晰边界给 TA 可靠支撑。" },
  older_sister: { id: "older_sister", label: "姐姐型陪伴者", shortLabel: "姐姐", category: "家人角色", summary: "你常以细致理解、温和提醒和持续陪伴照顾关系。" },
  younger_brother: { id: "younger_brother", label: "弟弟型同行者", shortLabel: "弟弟", category: "家人角色", summary: "你带来直接、坦率和一起行动的轻快能量。" },
  younger_sister: { id: "younger_sister", label: "妹妹型治愈者", shortLabel: "妹妹", category: "家人角色", summary: "你用亲近、鲜活和自然依赖，让 TA 感到被需要。" },
  father: { id: "father", label: "爸爸型依靠", shortLabel: "爸爸", category: "家人角色", summary: "你习惯提供方向、秩序和现实安全感，成为稳定后盾。" },
  mother: { id: "mother", label: "妈妈型照料者", shortLabel: "妈妈", category: "家人角色", summary: "你会主动留意情绪与生活细节，用持续照料托住 TA。" },
  bestie: { id: "bestie", label: "闺蜜型密友", shortLabel: "闺蜜", category: "朋友关系", summary: "你适合分享细碎心事、及时共情，也愿意站在 TA 这一边。" },
  brotherhood: { id: "brotherhood", label: "兄弟型伙伴", shortLabel: "兄弟", category: "朋友关系", summary: "你更擅长并肩扛事、直接支持，在行动里表达在乎。" },
  close_friend: { id: "close_friend", label: "挚友型陪伴", shortLabel: "挚友", category: "朋友关系", summary: "你重视长久信任和彼此空间，是稳定而不过界的陪伴。" },
  casual_friend: { id: "casual_friend", label: "朋友型相处", shortLabel: "朋友", category: "朋友关系", summary: "你们更适合轻松来往、保持分寸，在舒服距离里相互欣赏。" },
  teammate: { id: "teammate", label: "搭档型同盟", shortLabel: "搭档", category: "同行关系", summary: "你擅长与 TA 分工配合、共同完成目标，并尊重彼此能力。" },
  mentor: { id: "mentor", label: "导师型引路人", shortLabel: "导师", category: "成长关系", summary: "你倾向提供视角、方法与反馈，推动 TA 看见新的可能。" },
  playmate: { id: "playmate", label: "玩伴型快乐搭子", shortLabel: "玩伴", category: "同行关系", summary: "你能带来新鲜体验和松弛感，让相处更轻盈有趣。" },
  rival: { id: "rival", label: "对手型推动者", shortLabel: "对手", category: "成长关系", summary: "你们容易在较劲与欣赏之间彼此激发，关系需要清楚边界。" },
};

export type LegacyTestType = "核心需求满足" | "脆弱点承接" | "长期磨合";
export type RelationshipTestType = "情绪陪伴" | "日常相处" | "守护成长" | "共同体验" | "边界冲突";

export type GeneratedTestQuestion = {
  id: string;
  question: string;
  eyebrow: string;
  dimension: string;
  testType: LegacyTestType | RelationshipTestType;
  riskItem?: boolean;
  options: Array<{ label: string }>;
};

export type FormulaVerdictKey = "fated" | "likely" | "growing" | "misaligned" | "not_fated";

export type FormulaReview = {
  questionId: string;
  question: string;
  testType: LegacyTestType;
  riskItem: boolean;
  selectedOption: string;
  selectedExplanation: string;
  correctOption: string;
  correctExplanation: string;
  correct: boolean;
};

export type LegacyFormulaTestResult = {
  version: 1;
  testId: string;
  starId: string;
  total: number;
  correctCount: number;
  riskWrongCount: number;
  verdict: {
    key: FormulaVerdictKey;
    title: string;
    summary: string;
  };
  basis?: {
    mbti: string;
    threePillars: string;
    coreConcerns: string[];
    summary: string;
  };
  reviews: FormulaReview[];
};

export type RelationshipIdentityReview = {
  questionId: string;
  question: string;
  testType: RelationshipTestType;
  selectedOption: string;
  explanation: string;
  primaryRole: RelationshipRoleDefinition;
  secondaryRole: RelationshipRoleDefinition;
};

export type RelationshipIdentityResult = {
  version: 2;
  testId: string;
  starId: string;
  total: number;
  primaryRole: RelationshipRoleDefinition & { score: number };
  roleRanking: Array<RelationshipRoleDefinition & { score: number }>;
  basis: {
    mbti: string;
    threePillars: string;
    observationFocus: string[];
    summary: string;
  };
  reviews: RelationshipIdentityReview[];
};

export type ThreePillarCompositeResult = {
  version: 3;
  starId: string;
  userThreePillars: string;
  starThreePillars: string;
  headline: string;
  insight: string;
  tension: string;
  dimensions: Array<{
    label: string;
    tendency: "自然协同" | "彼此互补" | "需要磨合";
    description: string;
  }>;
};

export type FormulaTestResult = LegacyFormulaTestResult | RelationshipIdentityResult | ThreePillarCompositeResult;

export const FORMULA_RESULT_PREFIX = "MYFATE_FORMULA_V1\n";
export const RELATIONSHIP_RESULT_PREFIX = "MYFATE_RELATIONSHIP_V2\n";
export const COMPOSITE_RESULT_PREFIX = "MYFATE_COMPOSITE_V3\n";

export function serializeFormulaResult(result: FormulaTestResult) {
  const prefix = result.version === 3
    ? COMPOSITE_RESULT_PREFIX
    : result.version === 2
      ? RELATIONSHIP_RESULT_PREFIX
      : FORMULA_RESULT_PREFIX;
  return `${prefix}${JSON.stringify(result)}`;
}

export function parseFormulaResult(value: string | null | undefined): FormulaTestResult | null {
  const prefix = value?.startsWith(COMPOSITE_RESULT_PREFIX)
    ? COMPOSITE_RESULT_PREFIX
    : value?.startsWith(RELATIONSHIP_RESULT_PREFIX)
      ? RELATIONSHIP_RESULT_PREFIX
      : value?.startsWith(FORMULA_RESULT_PREFIX)
        ? FORMULA_RESULT_PREFIX
        : null;
  if (!value || !prefix) return null;
  try {
    const parsed = JSON.parse(value.slice(prefix.length)) as FormulaTestResult;
    if (parsed?.version === 3 && Array.isArray(parsed.dimensions) && typeof parsed.headline === "string") return parsed;
    if (parsed?.version === 2 && Array.isArray(parsed.roleRanking) && Array.isArray(parsed.reviews)) return parsed;
    if (parsed?.version === 1 && Array.isArray(parsed.reviews)) return parsed;
    return null;
  } catch {
    return null;
  }
}
