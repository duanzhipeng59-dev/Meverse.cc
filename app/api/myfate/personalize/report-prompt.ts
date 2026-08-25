import type { AnswerSnapshot, FateInterpretation } from "../../../myfate-engine";

export const MYFATE_REPORT_SYSTEM_PROMPT = `你是 Myfate 的关系解读师。请只输出合法 JSON。
结论、关系类型和全部可视化分数已经由公式确定，你不能修改、质疑或重新计算。
MBTI 与三柱关系是主要依据；行为测试只是现实表现证据，不能反客为主。
这是一项娱乐性关系探索，不是心理诊断或现实预测。不得断言明星私生活。
所有命理信息必须翻译成普通关系语言，禁止出现日主、五行旺衰、生发、相克、金性、木性、夫妻宫等术语。
必须写清双方如何互相影响，以及这种影响会在哪种生活场景里出现。避免“多沟通”“互相理解”“共同成长”等空泛结论。
七个板块不得重复：初始吸引解释为什么来电；情绪连接解释能否走进内心；沟通默契解释是否同频；互补成长解释彼此是加成还是负担；长期稳定解释热恋后能否过日子；宿命/烙印感解释关系影响有多深；冲突消耗解释具体拉扯循环。
冲突强不等于缘分深，烙印感高也不等于长期适合。不要生成额外的行动指南、AI解读或综合关系动力模块。`;

type PromptInput = {
  starProfile: Record<string, unknown>;
  userProfile: Record<string, unknown>;
  formulaEvidence: FateInterpretation["visualEvidence"];
  analysisDraft: Record<string, unknown>;
  behaviorScores: Record<string, number>;
  answers: AnswerSnapshot[];
  score: number;
  verdict: string;
};

function formatAnswers(answers: AnswerSnapshot[]) {
  return answers.map((answer, index) => ({
    index: index + 1,
    scene: answer.question,
    choice: answer.answer,
    dimension: answer.dimension,
    value: answer.value,
  }));
}

export function buildMyfateReportPrompt(input: PromptInput) {
  const modelInput = {
    userProfile: input.userProfile,
    targetProfile: input.starProfile,
    fixedResult: {
      legacyScore: input.score,
      verdict: input.verdict,
      visualEvidence: input.formulaEvidence,
    },
    analysisDraft: input.analysisDraft,
    initialTestEvidence: {
      dimensionScores: input.behaviorScores,
      answers: formatAnswers(input.answers),
    },
  };

  return `根据下面的结构化输入生成高级缘分报告。输入中的分数和关系类型必须原样保留，仅生成文字解读。\n\n${JSON.stringify(modelInput, null, 2)}\n\n请输出以下 JSON 结构，字段不得缺失：\n${JSON.stringify({
    headline: "一句具有辨识度的关系结论",
    summary: "解释缘分深度与长期匹配为何相同或不同",
    attraction: "用行为证据概括关系优势",
    friction: "用行为证据概括现实风险",
    advice: "兼容字段，简短写一句具体提醒",
    mbtiInsight: "沟通默契板块，90至160字",
    behaviorInsight: "初步测试呈现的现实行为模式，90至160字",
    pillarInsight: "宿命/烙印感板块，90至160字",
    coreAttraction: "初始吸引板块，90至160字",
    supportPattern: "互补成长板块，90至160字",
    dailyCompatibility: "生活适配的兼容字段，90至160字",
    intimacyRhythm: "情绪连接板块，90至160字",
    conflictCycle: "冲突消耗板块，90至160字",
    longTermPotential: "长期稳定板块，90至160字",
    relationshipDynamic: "兼容字段，简短总结双分数差异",
    actionPlan: ["兼容字段1", "兼容字段2", "兼容字段3"],
  }, null, 2)}`;
}
