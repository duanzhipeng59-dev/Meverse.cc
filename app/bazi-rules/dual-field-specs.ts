// ── 双人合盘九章 23 字段生成规则表(结构与现有 DUAL_TEMPLATE_SECTIONS 完全一致) ──
// 字段不增不减不改序;"{A}的底色"/"{B}的底色" 用 idTemplate 占位,运行时按双方姓名
// 解析(prompt 与一致性校验共用同一解析,期望 label 永远同步)。
// 字数上限沿用 DUAL_FIELD_CHAR_LIMITS 现值(样本校准列为后续)。

import { DUAL_DEFAULT_CHAR_LIMIT, DUAL_FIELD_CHAR_LIMITS } from "../myfate-dual-reading";

export type DualSectionKey = "overview" | "profiles" | "attraction" | "dynamics" | "friction" | "intimacy" | "collaboration" | "family" | "rhythm";

export type DualFieldSpec = {
  /** 字段 ID(label);含 {A}/{B} 占位的为动态 label */
  id: string;
  section: DualSectionKey;
  order: number;
  title: string;
  inputData: string[];
  triggerConditions: string;
  interpretationRules: string[];
  evidence: string[];
  writingStructure: string;
  lengthLimit: number;
  tone: string;
  prohibited: string[];
  dependencies: string[];
  validation: {
    requireQuoteMark?: boolean;
    mustCiteGanzhi?: boolean;
    mustCiteRelation?: boolean;
    quantifiedFormat?: "match-level" | "annual-select";
  };
};

const limit = (label: string) => DUAL_FIELD_CHAR_LIMITS[label] ?? (label.endsWith("的底色") ? 300 : DUAL_DEFAULT_CHAR_LIMIT);

export const DUAL_SECTION_TITLES: Record<DualSectionKey, string> = {
  overview: "合盘总览", profiles: "双方底色", attraction: "吸引来源", dynamics: "相处模式",
  friction: "摩擦与化解", intimacy: "亲密与责任", collaboration: "事业财富协作", family: "家庭六亲", rhythm: "未来节奏",
};

/** 动态 label 解析:{A}/{B} → 实际姓名 */
export function resolveDualLabel(id: string, nameA: string, nameB: string): string {
  return id.replaceAll("{A}", nameA).replaceAll("{B}", nameB);
}

export const DUAL_FIELD_SPECS: DualFieldSpec[] = [
  // ── 01 overview 合盘总览(3) ──
  {
    id: "匹配定调", section: "overview", order: 1, title: "关系整体定调与等级",
    inputData: ["relation.dayMasterText", "relation.crossRelationTexts", "relation.strengthComboText", "relation.wuxingComplementText"],
    triggerConditions: "按跨盘互动密度与互补/互耗定性分化:互动多且互补→中上等;互动多但互耗→课题型;互动少→平稳型",
    interpretationRules: [
      "开头一句总评+定性等级(如「中上等合婚」「互补大于消耗」),等级词打「」",
      "引用最关键的 1-2 条盘面依据(跨盘干支互动/旺衰组合/互补定性,只能引用关系事实里的条目)",
      "定调克制,不捧不吓",
    ],
    evidence: ["relation.cross-", "relation.daymaster", "relation.strength-combo"],
    writingStructure: "总评+等级(「」) → 1-2 条关键依据 → 一句关系主线",
    lengthLimit: limit("匹配定调"), tone: "资深合婚师断语",
    prohibited: ["打分式百分比匹配度", "宿命论断言"], dependencies: [],
    validation: { requireQuoteMark: true },
  },
  {
    id: "关系关键词", section: "overview", order: 2, title: "3-4 个关系关键词",
    inputData: ["relation.dayMasterText", "relation.wuxingComplementText", "relation.crossRelationTexts"],
    triggerConditions: "关键词来自盘面结构(如土水相济/快慢错位/财务互补),不得凭空造词",
    interpretationRules: ["一行式 3-4 个关键词,逗号分隔,每个词都能在关系事实中找到依据"],
    evidence: ["relation."],
    writingStructure: "一行式清单", lengthLimit: limit("关系关键词"), tone: "凝练",
    prohibited: ["空泛词(相爱相杀之类无盘面依据的)"], dependencies: ["匹配定调"], validation: {},
  },
  {
    id: "互补与消耗", section: "overview", order: 3, title: "双向互补与最大消耗点",
    inputData: ["relation.wuxingComplementText", "relation.strengthComboText"],
    triggerConditions: "按互补三档定性(互补/中性/互耗)分化;双向各一句,最大消耗点一句",
    interpretationRules: [
      "A补B什么、B补A什么各一句(引喜忌互补事实)",
      "最大的消耗点一句(互耗方向或旺衰组合课题),结论先行",
    ],
    evidence: ["relation.wuxing", "relation.strength-combo"],
    writingStructure: "A补B → B补A → 最大消耗点", lengthLimit: limit("互补与消耗"), tone: "直断",
    prohibited: ["只报互补不报消耗"], dependencies: ["匹配定调"], validation: {},
  },
  // ── 02 profiles 双方底色(2,动态 label) ──
  {
    id: "{A}的底色", section: "profiles", order: 1, title: "A 方旺衰/道法/喜忌底色",
    inputData: ["persons.A"],
    triggerConditions: "与个人报告完全同口径:旺衰七档/格局名/扶抑喜忌来自规则层锚点,不得改判",
    interpretationRules: [
      "旺衰定性一句(「」括注档位,与锚点一致)",
      "喜神忌神各一行(五行+十神身份,与锚点一致)",
      "两行式,不展开成段",
    ],
    evidence: ["person.A."],
    writingStructure: "旺衰一句 → 喜神一行 → 忌神一行", lengthLimit: limit("{A}的底色"), tone: "克制",
    prohibited: ["输出锚点之外的档位", "写成完整画像(那是单人报告的事)"], dependencies: [],
    validation: { requireQuoteMark: true },
  },
  {
    id: "{B}的底色", section: "profiles", order: 2, title: "B 方旺衰/道法/喜忌底色",
    inputData: ["persons.B"],
    triggerConditions: "同 {A}的底色,B 方锚点",
    interpretationRules: ["与 {A}的底色 同构,严格用 B 的锚点,不得与 A 混写"],
    evidence: ["person.B."],
    writingStructure: "旺衰一句 → 喜神一行 → 忌神一行", lengthLimit: limit("{B}的底色"), tone: "克制",
    prohibited: ["输出锚点之外的档位", "与 A 的定性张冠李戴"], dependencies: ["{A}的底色"],
    validation: { requireQuoteMark: true },
  },
  // ── 03 attraction 吸引来源(3) ──
  {
    id: "五行吸引", section: "attraction", order: 1, title: "日主五行生克的吸引机制",
    inputData: ["relation.dayMasterText"],
    triggerConditions: "按日主关系四态分化:比和/相生(谁生谁)/相克(谁克谁)",
    interpretationRules: [
      "按关系事实给定的日主生克方向展开,落到「这种组合为什么容易互相看对眼」",
      "相生方向写清谁付出谁接收;相克写清主导-被约束的张力如何变成吸引",
    ],
    evidence: ["relation.daymaster"],
    writingStructure: "生克事实 → 吸引机制 → 一句代价提醒",
    lengthLimit: limit("五行吸引"), tone: "关系洞察",
    prohibited: ["改写生克方向"], dependencies: [], validation: {},
  },
  {
    id: "十神互见", section: "attraction", order: 2, title: "双方日主互为十神的初始滤镜",
    inputData: ["relation.spousePalaceText", "persons"],
    triggerConditions: "A 看 B 与 B 看 A 的十神互见(按判断对象给定的互见结论)",
    interpretationRules: [
      "A 眼中的 B 与 B 眼中的 A 各一句(十神+滤镜含义)",
      "只引用判断对象给出的互见结论,不得自行另算",
    ],
    evidence: ["relation.spouse-palace"],
    writingStructure: "A看B → B看A → 滤镜的错位可能",
    lengthLimit: limit("十神互见"), tone: "关系洞察",
    prohibited: ["编造判断对象之外的十神关系"], dependencies: ["五行吸引"], validation: {},
  },
  {
    id: "初识磁场", section: "attraction", order: 3, title: "初识阶段的吸引点与错位",
    inputData: ["relation.crossRelationTexts", "relation.strengthComboText"],
    triggerConditions: "按跨盘互动与旺衰组合:互动吉(合/三合)初识顺;互动冲刑初识快但埋雷",
    interpretationRules: ["初识最容易互相吸引的 1-2 个点(扣盘面)", "需要警惕的一个错位(滤镜与真实的落差)"],
    evidence: ["relation.cross-"],
    writingStructure: "吸引点 → 错位提醒", lengthLimit: limit("初识磁场"), tone: "场景感",
    prohibited: ["无依据的浪漫化描写"], dependencies: ["十神互见"], validation: {},
  },
  // ── 04 dynamics 相处模式(3) ──
  {
    id: "日常相处", section: "dynamics", order: 1, title: "日常节奏与主动被动",
    inputData: ["relation.strengthComboText", "relation.dayMasterText"],
    triggerConditions: "按旺衰组合:双强/双弱/强弱互补决定主导权与节奏;日主生克定主动方",
    interpretationRules: ["谁主动谁接收、节奏谁快谁慢,基于双方旺衰与日主关系", "落到具体日常场景(决策/出行/社交)"],
    evidence: ["relation.strength-combo", "relation.daymaster"],
    writingStructure: "节奏定性 → 场景举例", lengthLimit: limit("日常相处"), tone: "生活化",
    prohibited: ["刻板性别分工断言"], dependencies: [], validation: {},
  },
  {
    id: "沟通风格", section: "dynamics", order: 2, title: "表达与吸收模式的差异与合拍点",
    inputData: ["persons.A.tenGodsText", "persons.B.tenGodsText"],
    triggerConditions: "按双方主导十神分化:食伤主导爱说/印星主导爱想/官杀主导讲规则等",
    interpretationRules: ["两人表达/吸收模式差异一句", "合拍点一句(什么话题/场合沟通最顺)"],
    evidence: ["person.A.", "person.B."],
    writingStructure: "差异 → 合拍点 → 卡点提示", lengthLimit: limit("沟通风格"), tone: "具体",
    prohibited: ["「需要多沟通」式空话"], dependencies: ["日常相处"], validation: {},
  },
  {
    id: "付出与回应", section: "dynamics", order: 3, title: "付出方向的对频程度",
    inputData: ["relation.dayMasterText", "relation.wuxingComplementText"],
    triggerConditions: "按日主生克方向+喜忌互补:A习惯给的 vs B想要收的是否同一路",
    interpretationRules: ["A 习惯给什么、B 想收什么各一句", "对频/错位定性一句(依据生克与互补事实)"],
    evidence: ["relation.daymaster", "relation.wuxing"],
    writingStructure: "A给 → B收 → 对频/错位", lengthLimit: limit("付出与回应"), tone: "直断",
    prohibited: ["单方面指责式表述"], dependencies: ["日常相处"], validation: {},
  },
  // ── 05 friction 摩擦与化解(3) ──
  {
    id: "主要摩擦点", section: "friction", order: 1, title: "跨盘刑冲与结构性摩擦",
    inputData: ["relation.crossRelationTexts", "relation.wuxingComplementText"],
    triggerConditions: "逐条引用跨盘刑冲合害:是什么、落在哪对柱位、在关系里表现为什么;无跨盘刑冲时写「结构平稳」并指出最需主动经营的点",
    interpretationRules: [
      "只解读关系事实给出的条目(合冲刑害/三合/互耗),不得补造",
      "每条落到现实表现(家务/钱/长辈/时间安排等具体场景)",
    ],
    evidence: ["relation.cross-", "relation.wuxing"],
    writingStructure: "逐条:干支依据 → 现实表现", lengthLimit: limit("主要摩擦点"), tone: "不回避不夸大",
    prohibited: ["引用不存在的关系", "恐吓式表述"], dependencies: [], validation: { mustCiteRelation: true },
  },
  {
    id: "触发雷区", section: "friction", order: 2, title: "最易点燃的场景",
    inputData: ["relation.crossRelationTexts", "relation.strengthComboText"],
    triggerConditions: "从摩擦点提炼 1-2 个高敏场景(如双强遇决策权、互耗遇财务)",
    interpretationRules: ["每个雷区写触发条件+双方典型反应", "扣盘面依据,不写万能雷区"],
    evidence: ["relation.cross-", "relation.strength-combo"],
    writingStructure: "雷区1(触发+反应) → 雷区2", lengthLimit: limit("触发雷区"), tone: "具体",
    prohibited: ["泛泛的「不信任」「不沟通」"], dependencies: ["主要摩擦点"], validation: {},
  },
  {
    id: "化解处方", section: "friction", order: 3, title: "针对摩擦的具体做法",
    inputData: ["relation.crossRelationTexts", "relation.wuxingComplementText"],
    triggerConditions: "每个摩擦点配一个可执行处方;处方扣结构(如冲夫妻宫→空间分隔;互耗→财务边界)",
    interpretationRules: ["逐条对应摩擦点给做法,具体到机制(谁先让/怎么分/多久一次)", "不写「互相包容」式空话"],
    evidence: ["relation.cross-", "relation.wuxing"],
    writingStructure: "摩擦1处方 → 摩擦2处方 → 一句总原则",
    lengthLimit: limit("化解处方"), tone: "可操作",
    prohibited: ["无法执行的口号"], dependencies: ["主要摩擦点"], validation: {},
  },
  // ── 06 intimacy 亲密与责任(2) ──
  {
    id: "夫妻宫互看", section: "intimacy", order: 1, title: "双方日支互关系与互见体验",
    inputData: ["relation.spousePalaceText"],
    triggerConditions: "按双方日支关系(合/冲/比和)与日支本气十神互见分化",
    interpretationRules: [
      "引用判断对象给定的夫妻宫互看事实(双方日支+互关系+互见十神)",
      "落到亲密关系里的真实体验(绑定感/张力/内核色彩),不断言婚姻好坏",
    ],
    evidence: ["relation.spouse-palace"],
    writingStructure: "宫位事实 → 亲密体验 → 张力提示",
    lengthLimit: limit("夫妻宫互看"), tone: "亲密洞察",
    prohibited: ["由宫位冲断言必然分离"], dependencies: [], validation: {},
  },
  {
    id: "亲密与责任", section: "intimacy", order: 2, title: "责任分配与托底结构",
    inputData: ["relation.strengthComboText", "relation.wuxingComplementText"],
    triggerConditions: "按旺衰组合定谁更需要被托底/谁担更多执行责任",
    interpretationRules: ["责任分配倾向(谁管什么)", "谁更需要被托底+托底方式"],
    evidence: ["relation.strength-combo"],
    writingStructure: "责任倾向 → 托底结构", lengthLimit: limit("亲密与责任"), tone: "务实",
    prohibited: ["性别刻板断言"], dependencies: ["夫妻宫互看"], validation: {},
  },
  // ── 07 collaboration 事业财富协作(3) ──
  {
    id: "搭伙做事", section: "collaboration", order: 1, title: "共同做事的合力评估",
    inputData: ["relation.wuxingComplementText", "relation.strengthComboText"],
    triggerConditions: "按喜忌互补与旺衰组合:互补型合力强;互耗型合伙需重规则",
    interpretationRules: ["一起做事/做生意的合力判断(结论先行)", "依据互补/互耗与组合事实"],
    evidence: ["relation.wuxing", "relation.strength-combo"],
    writingStructure: "合力定性 → 依据 → 适配形式(合伙/分工/各干各的)",
    lengthLimit: limit("搭伙做事"), tone: "商业判断",
    prohibited: ["断言必然成功/失败"], dependencies: [], validation: {},
  },
  {
    id: "资源互补", section: "collaboration", order: 2, title: "双向资源互补清单",
    inputData: ["relation.wuxingComplementText", "persons.A.tenGodsText", "persons.B.tenGodsText"],
    triggerConditions: "A 的资源帮 B 什么、B 的资源帮 A 什么(扣十神能力与喜忌)",
    interpretationRules: ["双向各一句,具体到能力类型(渠道/专业/资金/执行)"],
    evidence: ["relation.wuxing"],
    writingStructure: "A帮B → B帮A", lengthLimit: limit("资源互补"), tone: "清单式",
    prohibited: ["空泛的「互补」"], dependencies: ["搭伙做事"], validation: {},
  },
  {
    id: "合作雷区", section: "collaboration", order: 3, title: "合伙与财务的风险点",
    inputData: ["relation.wuxingComplementText", "persons.A", "persons.B"],
    triggerConditions: "任一方比劫旺为忌时必须写明财务边界;互耗方向写明放大效应",
    interpretationRules: ["合伙/财务风险点(结论先行)", "具体边界建议(分账/决策权/退出机制)"],
    evidence: ["relation.wuxing", "person.A.", "person.B."],
    writingStructure: "风险点 → 边界处方", lengthLimit: limit("合作雷区"), tone: "风险提示",
    prohibited: ["绝对禁止合伙式恐吓(除非双方比劫皆旺为忌)"], dependencies: ["搭伙做事"], validation: {},
  },
  // ── 08 family 家庭六亲(2) ──
  {
    id: "家庭接纳", section: "family", order: 1, title: "双方家庭风格与接纳度",
    inputData: ["persons.A", "persons.B"],
    triggerConditions: "按各自印星/比劫状态(年柱月柱):印旺=家庭参与度高;比劫旺=同辈家族事务多",
    interpretationRules: ["双方家庭风格各一句(扣各自盘面)", "互相接纳度倾向一句"],
    evidence: ["person.A.", "person.B."],
    writingStructure: "A家风格 → B家风格 → 接纳度倾向",
    lengthLimit: limit("家庭接纳"), tone: "家庭观察",
    prohibited: ["断言婆媳/翁婿必然矛盾"], dependencies: [], validation: {},
  },
  {
    id: "事务分工", section: "family", order: 2, title: "家务/决策/人情分工",
    inputData: ["relation.strengthComboText", "persons.A.tenGodsText", "persons.B.tenGodsText"],
    triggerConditions: "按十神能力与旺衰组合:官杀强管规则、财星强管钱、印星强管人情",
    interpretationRules: ["家务、决策、人情往来三类各给分工倾向", "扣双方十神,不写性别模板"],
    evidence: ["person.A.", "person.B.", "relation.strength-combo"],
    writingStructure: "家务 → 决策 → 人情", lengthLimit: limit("事务分工"), tone: "务实",
    prohibited: ["性别刻板分工"], dependencies: ["家庭接纳"], validation: {},
  },
  // ── 09 rhythm 未来节奏(2) ──
  {
    id: "关系关键年", section: "rhythm", order: 1, title: "未来十年的关系关键年份",
    inputData: ["relation.annualSync"],
    triggerConditions: "只依据逐年顺压信号挑选 3-6 个关键年:双方同顺=顺势年;双方同压/冲夫妻宫=压力年;节奏错位年亦可选;其余年份不写",
    interpretationRules: [
      "逐年格式「YYYY年(干支) · 年度标签:对关系的影响与建议」",
      "年份与干支一律取自顺压信号清单,不得编造区间外年份",
      "压力年必须配应对建议,顺势年写推进事项",
    ],
    evidence: ["relation.annual-"],
    writingStructure: "逐年条目(3-6 年,区间止于流年清单末年)",
    lengthLimit: limit("关系关键年"), tone: "年度断语",
    prohibited: ["写非关键年份凑数", "编造年份干支", "断言必然结婚/分手"],
    dependencies: [], validation: { quantifiedFormat: "annual-select", mustCiteGanzhi: true },
  },
  {
    id: "养护提醒", section: "rhythm", order: 2, title: "长期经营的核心原则",
    inputData: ["relation.crossRelationTexts", "relation.wuxingComplementText", "relation.strengthComboText"],
    triggerConditions: "来自盘面结构最核心的 1-2 条(最大摩擦结构/最大互补资源)",
    interpretationRules: ["1-2 条,每条扣盘面依据", "可长期执行的原则,非一次性动作"],
    evidence: ["relation."],
    writingStructure: "原则1(依据+做法) → 原则2", lengthLimit: limit("养护提醒"), tone: "收束",
    prohibited: ["空泛祝福"], dependencies: ["关系关键年"], validation: {},
  },
];

/** 章内字段按声明顺序取用(姓名参数保留以对称;label 解析由调用方进行) */
export function dualFieldSpecsOfSection(section: DualSectionKey): DualFieldSpec[] {
  return DUAL_FIELD_SPECS.filter((spec) => spec.section === section)
    .sort((a, b) => a.order - b.order);
}

/** 全部期望 label(按姓名解析,供 prompt 与一致性校验共用) */
export function dualExpectedLabels(nameA: string, nameB: string): Record<DualSectionKey, string[]> {
  const map = {} as Record<DualSectionKey, string[]>;
  for (const key of Object.keys(DUAL_SECTION_TITLES) as DualSectionKey[]) {
    map[key] = dualFieldSpecsOfSection(key).map((spec) => resolveDualLabel(spec.id, nameA, nameB));
  }
  return map;
}

/** 23 字段总数守恒断言 */
export const DUAL_FIELD_COUNT = DUAL_FIELD_SPECS.length;
