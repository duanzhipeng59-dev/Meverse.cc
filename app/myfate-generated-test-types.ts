export type GeneratedTestQuestion = {
  id: string;
  question: string;
  eyebrow: string;
  dimension: string;
  testType: "核心需求满足" | "脆弱点承接" | "长期磨合";
  riskItem: boolean;
  options: Array<{ label: string }>;
};

export type FormulaVerdictKey = "fated" | "likely" | "growing" | "misaligned" | "not_fated";

export type FormulaReview = {
  questionId: string;
  question: string;
  testType: GeneratedTestQuestion["testType"];
  riskItem: boolean;
  selectedOption: string;
  selectedExplanation: string;
  correctOption: string;
  correctExplanation: string;
  correct: boolean;
};

export type FormulaTestResult = {
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
  reviews: FormulaReview[];
};

export const FORMULA_RESULT_PREFIX = "MYFATE_FORMULA_V1\n";

export function serializeFormulaResult(result: FormulaTestResult) {
  return `${FORMULA_RESULT_PREFIX}${JSON.stringify(result)}`;
}

export function parseFormulaResult(value: string | null | undefined): FormulaTestResult | null {
  if (!value?.startsWith(FORMULA_RESULT_PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(FORMULA_RESULT_PREFIX.length)) as FormulaTestResult;
    return parsed?.version === 1 && Array.isArray(parsed.reviews) ? parsed : null;
  } catch {
    return null;
  }
}
