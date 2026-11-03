// ── 九章 35 字段生成规则表(交付物 B,机器可读版) ────────────────────────
// 以项目现有九章 35 字段为唯一结构基准:字段 id(label)、顺序、数量与既有模板一致,
// 不增不减不改序。每字段声明:输入数据(judgment 锚点/事实键)、触发条件、命理推导
// 规则、必引证据、写作结构、字数、语气、禁则、依赖与机器校验钩子。
// 本表既驱动按章生成 prompt(scripts/gen-field-rules-doc.mjs 由此产出交付物 B 文档),
// 也驱动 consistency.ts 的机器校验——规则与校验永远同源。
//
// 通用推导纪律(全部字段生效,prompt 与校验共用):
// - 锚点(旺衰档/格局名/喜忌/调候/财富档)必须原样引用,不得改判;
// - 禁编造命理事实:干支、十神、位置、关系只来自判断对象;
// - 不虚构用户经历,不使用绝对化断言(详见 consistency.ts);

import { DEFAULT_FIELD_CHAR_LIMIT, FIELD_CHAR_LIMITS } from "../myfate-static-reading";

export type SectionKey = "portrait" | "pattern" | "education" | "career" | "wealth" | "relationship" | "wellbeing" | "children" | "family";

export type FieldSpec = {
  /** 字段 ID = insights 的 label,保留原有名称 */
  id: string;
  section: SectionKey;
  order: number;
  /** 字段职责一句话 */
  title: string;
  /** 需要读取的判断对象键(anchors.* / facts.*) */
  inputData: string[];
  /** 命盘条件如何触发差异化内容 */
  triggerConditions: string;
  /** 命理推导规则(确定性判断 → 表达) */
  interpretationRules: string[];
  /** 必须引用的 evidence id(至少其一;空数组=不强制) */
  evidence: string[];
  /** 写作顺序与结构 */
  writingStructure: string;
  lengthLimit: number;
  tone: string;
  /** 禁止出现的内容 */
  prohibited: string[];
  /** 依赖的其他字段锚点(先决判断) */
  dependencies: string[];
  /** 机器校验钩子(consistency.ts 消费) */
  validation: {
    /** 必须含至少一处「」结论词 */
    requireQuoteMark?: boolean;
    /** 需要引用具体干支 */
    mustCiteGanzhi?: boolean;
    /** 量化格式例外(属该字段标准格式,不算绝对化违规) */
    quantifiedFormat?: "wealth-tier" | "love-probability" | "gender-lean" | "score-per-item" | "marriage-level" | "education-tier";
  };
};

const limit = (label: string) => FIELD_CHAR_LIMITS[label] ?? DEFAULT_FIELD_CHAR_LIMIT;

export const SECTION_TITLES: Record<SectionKey, string> = {
  portrait: "人生画像", pattern: "格局", education: "学业", career: "事业", wealth: "财富",
  relationship: "感情", wellbeing: "健康", children: "子女", family: "六亲",
};

export const FIELD_SPECS: FieldSpec[] = [
  // ── 01 portrait 人生画像(7) ──
  {
    id: "旺衰定性", section: "portrait", order: 1, title: "日主旺衰的定性结论与人格底色",
    inputData: ["anchors.strength", "anchors.dayMaster", "anchors.monthOrder", "facts.wuXing"],
    triggerConditions: "按旺衰档位(从强/身强/偏强/中和/偏弱/身弱/从弱)与得令得地得势明细差异化;从格必须点明弃命从势的逻辑",
    interpretationRules: [
      "开头直接定性「锚点档位」,档位词必须与锚点完全一致,不得输出锚点之外的档位",
      "引用得令/得地/得势中最有辨识度的 1-2 条依据(具体干支)",
      "点名最强五行及其十神身份,描述其力量在人格上的表现",
      "从格(从强/从弱)需写明日主孤立无援或一气专旺的结构,顺势而为的生存策略",
    ],
    evidence: ["structure.strength"],
    writingStructure: "结论(档位+一句人格定性)→ 命理依据(1-2条干支级证据)→ 现实解读(行为模式)→ 无需提醒段",
    lengthLimit: limit("旺衰定性"), tone: "命理师断语,克制、直接、有判断力",
    prohibited: ["输出锚点之外的旺衰档位", "中和盘写成身强或身弱", "绝对化人格断言"],
    dependencies: [], validation: { requireQuoteMark: true, mustCiteGanzhi: true },
  },
  {
    id: "道法与喜忌", section: "portrait", order: 2, title: "命局主线结构(道法标签)与喜忌总述",
    inputData: ["anchors.pattern", "anchors.fuYong", "anchors.tenGods", "anchors.tiaoHou"],
    triggerConditions: "道法标签由格局+前两大十神组合决定(如伤官生财/杀印相生/食神制杀/官印相生);扶抑与调候同向或冲突决定喜忌叙述的侧重",
    interpretationRules: [
      "开头给出道法标签「XX」(4-6字,最多8字,单标签)",
      "解释该组合的天然优势与做事风格;若调候与扶抑冲突,须提示权衡而非只报喜用",
      "以人物定性句收出(你天生…/你不是…而是…式)",
    ],
    evidence: ["structure.pattern", "structure.favorable", "structure.tiaohou"],
    writingStructure: "道法标签 → 组合优势解释 → 喜忌的现实含义 → 人物定性收束",
    lengthLimit: limit("道法与喜忌"), tone: "画像式,专业但落地",
    prohibited: ["把多个结构塞进一个道法标签", "调候用神与扶抑喜用混为一谈"],
    dependencies: ["旺衰定性"], validation: { requireQuoteMark: true },
  },
  {
    id: "喜神", section: "portrait", order: 3, title: "最喜的两行五行(一行式清单)",
    inputData: ["anchors.fuYong.favorable", "anchors.fuYong.mapping"],
    triggerConditions: "喜用五行由旺衰档确定性给出(身强克泄耗/身弱生扶/从势顺势/中和补弱),只列清单不展开",
    interpretationRules: ["严格按锚点列两行,每行=五行(十神,带来…短语)", "五行与十神身份必须与锚点 mapping 一致"],
    evidence: ["structure.favorable"],
    writingStructure: "一行式:五行（十神，带来…）、五行（十神，带来…)", prohibited: ["展开成段", "列出锚点之外的五行"],
    lengthLimit: limit("喜神"), tone: "克制清单", dependencies: ["旺衰定性"], validation: {},
  },
  {
    id: "忌神", section: "portrait", order: 4, title: "最忌的两行五行(一行式清单)",
    inputData: ["anchors.fuYong.cautious", "anchors.fuYong.mapping"],
    triggerConditions: "忌神由旺衰档确定性给出;短语写带来的竞争/消耗/束缚",
    interpretationRules: ["严格按锚点列两行,与喜神同一行式", "忌神短语须具体(何种消耗、何种束缚)"],
    evidence: ["structure.cautious"],
    writingStructure: "一行式:五行（十神，带来…）、五行（十神，带来…)", prohibited: ["展开成段", "恐吓式表述"],
    lengthLimit: limit("忌神"), tone: "克制清单", dependencies: ["旺衰定性"], validation: {},
  },
  {
    id: "闲神", section: "portrait", order: 5, title: "中性五行的边界说明",
    inputData: ["anchors.idle", "facts.wuXing"],
    triggerConditions: "闲神=不在喜忌清单的五行;无闲神时明确写无并一句带过",
    interpretationRules: ["列出闲神五行(十神),一两句说明中性作用与边界", "无闲神写「无」加一句说明"],
    evidence: ["structure.cautious"],
    writingStructure: "五行（十神）起头 → 中性作用 → 边界一句", prohibited: ["把闲神写成喜或忌"],
    lengthLimit: limit("闲神"), tone: "平实", dependencies: ["喜神", "忌神"], validation: {},
  },
  {
    id: "神煞底色", section: "portrait", order: 6, title: "驿马/阳刃/桃花三项的底色解读",
    inputData: ["facts.shenSha"],
    triggerConditions: "按每项有/无分化:有则写落点柱位与引动特征;无则解读这种无的人命意义",
    interpretationRules: ["分驿马/阳刃/桃花三行,每行名称:有/无——解读", "有则引用落点地支与柱位(以年支/日支查得)", "无的解读用倾向性表述(如驿马无=轨迹相对安稳)"],
    evidence: ["shensha.yima", "shensha.yangren", "shensha.taohua"],
    writingStructure: "三行并列,每行:神煞名:有/无——解读", prohibited: ["自行计算锚点之外的神煞", "把桃花直接推断为外遇或婚姻状态"],
    lengthLimit: limit("神煞底色"), tone: "中性偏故事感", dependencies: [], validation: {},
  },
  {
    id: "性格与行为模式", section: "portrait", order: 7, title: "十神结构驱动的性格画像",
    inputData: ["anchors.tenGods", "anchors.strength", "facts.wuXing"],
    triggerConditions: "主导十神+次强十神+旺衰档+最强五行共同决定画像;不同命盘必须产出不同人物标签",
    interpretationRules: ["按主导/次强十神写外在表现→内在动机→内外反差→心理底色", "结合旺衰档写能量水平(身强的推进感/身弱的借力感)", "收束一句有辨识度的人物判断"],
    evidence: ["tenGod.1", "tenGod.2", "structure.strength"],
    writingStructure: "外在表现 → 内在动机 → 内外反差 → 心理底色 → 收束句(自然段)",
    lengthLimit: limit("性格与行为模式"), tone: "人物特稿", prohibited: ["MBTI式贴标签", "万金油描述(外冷内热之类无依据定性)"],
    dependencies: ["旺衰定性"], validation: {},
  },

  // ── 02 pattern 格局(3) ──
  {
    id: "月令格局", section: "pattern", order: 1, title: "月令取格的定名与人生路径含义",
    inputData: ["anchors.pattern", "facts.transparentStems", "anchors.monthOrder"],
    triggerConditions: "格局名/成色/从格标记由引擎确定性判定;月令逢冲时须提及根基受动",
    interpretationRules: [
      "先写盘面事实:引用格局判定的 basis(月令藏干透出/建禄/阳刃/从格取势)",
      "格局名打「」(连同格字),必须与锚点一致",
      "成色按 tier 表述(本气透出层级高/余气透出偏弱/藏而不透以本气论)",
      "落到人生路径含义与聚焦建议,不空谈格局定义",
    ],
    evidence: ["structure.pattern"],
    writingStructure: "盘面事实 → 格局名(「」) → 路径含义 → 聚焦建议(条件句收尾)",
    lengthLimit: limit("月令格局"), tone: "专业断语",
    prohibited: ["给出锚点之外的格局名", "强套格局", "把格局直接等同富贵层次"],
    dependencies: ["旺衰定性"], validation: { requireQuoteMark: true, mustCiteGanzhi: true },
  },
  {
    id: "命盘结构特征", section: "pattern", order: 2, title: "2-3 个最显著干支组合的结构解读",
    inputData: ["facts.relationTexts", "anchors.tenGods", "facts.transparentStems"],
    triggerConditions: "从关系清单(合冲刑害/三合)与透干十神中提炼最显著的 2-3 个组合;关系少时以透干结构为主",
    interpretationRules: [
      "每个组合独立成段:结构名(核心优势/双刃剑)→ 具体干支依据 → 现实解读 → 定性收尾",
      "结构名必须与实际盘面相符(如伤官生财/杀印相生/食神制杀/财官双美)",
      "天干五合与六合只论合不默认化(锚点声明)",
      "三合局须引用化神五行",
    ],
    evidence: ["relation", "tenGod"],
    writingStructure: "组合1(结构名+依据+解读+收尾)→ 组合2 → 组合3",
    lengthLimit: limit("命盘结构特征"), tone: "结构解析",
    prohibited: ["引用判断对象里不存在的关系", "断化气", "把双刃剑只写成优势"],
    dependencies: ["月令格局"], validation: { mustCiteGanzhi: true },
  },
  {
    id: "结构清浊", section: "pattern", order: 3, title: "命局清浊与发力主线",
    inputData: ["facts.relationTexts", "anchors.pattern", "anchors.tenGods"],
    triggerConditions: "关系少而顺=清(发力主线明确);刑冲多=浊(内耗与拉扯);按实际关系清单定性,不由字数凑",
    interpretationRules: ["一段话直接说清浊与发力主线", "用「用X生X」或「以X制X」点出主线", "以条件句收尾(只要大运流年不来破坏…)"],
    evidence: ["relation"],
    writingStructure: "清浊定性 → 主线(「用X生X」) → 条件句收尾",
    lengthLimit: limit("结构清浊"), tone: "凝练断语",
    prohibited: ["与命盘结构特征重复论述同一组合"], dependencies: ["命盘结构特征"], validation: { requireQuoteMark: true },
  },

  // ── 03 education 学业(3) ──
  {
    id: "学历评估", section: "education", order: 1, title: "学习天分与学历基底档位",
    inputData: ["area.education", "anchors.fuYong", "anchors.tenGods"],
    triggerConditions: "印星/食伤的强弱与喜忌决定学习模式;印星喜用=吸收考试型,食伤喜用=输出应用型,均显=双通道",
    interpretationRules: [
      "先写盘面结构(印星/食伤的权重、透藏、被克与否)",
      "人物化解读天分与学习习惯(挑科/死记硬背/一遍就会等具体模式)",
      "末尾缓和档位表述:命理倾向学历基底在「XX档」,发挥特长上限可更高,过程易有波动",
    ],
    evidence: ["area.education"],
    writingStructure: "盘面结构 → 天分与习惯解读 → 档位表述(「XX档」)收尾",
    lengthLimit: limit("学历评估"), tone: "具体、不空泛",
    prohibited: ["写确定的最终学历", "写考试必然成功/失败"],
    dependencies: ["旺衰定性"], validation: { requireQuoteMark: true },
  },
  {
    id: "适合专业", section: "education", order: 2, title: "专业与领域方向的分级推荐",
    inputData: ["anchors.tenGods", "anchors.fuYong", "anchors.dominantElement"],
    triggerConditions: "主导十神+次强十神组合决定领域;推荐必须扣十神依据",
    interpretationRules: ["开头定性适合需要X、X思维的领域", "首选/其次分级清单,每类括注十神依据", "以对比句收尾(相比于纯理论,你更适合…)"],
    evidence: ["tenGod.1", "tenGod.2"],
    writingStructure: "定性句 → 首选(依据) → 其次(依据) → 对比收尾",
    lengthLimit: limit("适合专业"), tone: "建议式", prohibited: ["罗列无依据的完整专业名单"],
    dependencies: ["性格与行为模式"], validation: {},
  },
  {
    id: "考运关键节点", section: "education", order: 3, title: "未来十年考运强弱年份",
    inputData: ["facts.annual"],
    triggerConditions: "印星/食伤为喜用的年份思维活跃;忌神年易压抑分心;只写流年排盘区间内的年份",
    interpretationRules: ["引用具体年份+干支(一律取自流年排盘)", "指出超常发挥年份类型与需抗压准备的年份类型", "流年评分可作参考但不得编造区间外年份"],
    evidence: ["chart.pillar-2"],
    writingStructure: "活跃年份(年份+干支+特征) → 需准备年份(年份+干支+建议)",
    lengthLimit: limit("考运关键节点"), tone: "具体可操作",
    prohibited: ["编造流年排盘之外的年份干支", "断言必中/必败"],
    dependencies: ["学历评估"], validation: { mustCiteGanzhi: true },
  },

  // ── 04 career 事业(5) ──
  {
    id: "职业方向", section: "career", order: 1, title: "职业身份定性与最优路径",
    inputData: ["area.career", "anchors.tenGods", "anchors.strength", "anchors.fuYong"],
    triggerConditions: "主导十神+格局+旺衰共同决定身份标签与路径;身强宜主导/创业,身弱宜平台/辅助,从格顺势",
    interpretationRules: [
      "开头身份定性:你是一个天生的「XX」与「XX」",
      "点出最适路径与结构依据(如食伤生财=靠技术创意变现)",
      "写清大平台角色定位与创业/副业适配度",
    ],
    evidence: ["area.career", "tenGod.1"],
    writingStructure: "身份定性(「」) → 路径与依据 → 平台定位 → 创业适配",
    lengthLimit: limit("职业方向"), tone: "职业顾问式断语",
    prohibited: ["罗列不扣依据的职业清单"], dependencies: ["性格与行为模式"], validation: { requireQuoteMark: true },
  },
  {
    id: "管理与领导力", section: "career", order: 2, title: "管理类型与团队角色",
    inputData: ["anchors.tenGods", "anchors.strength", "facts.relationTexts"],
    triggerConditions: "官杀显+身强=拍板型;印星显=军师型;比劫旺=山头领袖型;食伤旺=扁平技术型;按实际组合定型",
    interpretationRules: ["定型「山头领袖型/军师参谋型/扁平技术型」等并打「」", "写自我驱动力、敢否拍板、一把手vs辅助位", "以能驾驭的团队规模与服众方式收尾"],
    evidence: ["tenGod.1", "structure.strength"],
    writingStructure: "定型(「」) → 驱动力与拍板风格 → 适合位置 → 团队规模与服众方式",
    lengthLimit: limit("管理与领导力"), tone: "管理者画像",
    prohibited: ["与职业方向重复论述"], dependencies: ["职业方向"], validation: { requireQuoteMark: true },
  },
  {
    id: "贵人/小人/与上级", section: "career", order: 3, title: "人际三行:贵人、小人、上级关系",
    inputData: ["anchors.tenGods", "anchors.fuYong", "facts.shenSha"],
    triggerConditions: "喜用十神=贵人人群;忌神十神=消耗人群;官杀喜忌=与上级关系基调",
    interpretationRules: ["分三行:贵人(人群+十神括注)/小人(类型+现实表现+十神为忌)/与上级(契合度与服管边界)", "天乙贵人等锚点未提供的神煞不得出现"],
    evidence: ["tenGod", "structure.favorable"],
    writingStructure: "贵人:… / 小人:… / 与上级关系:…(三行)",
    lengthLimit: limit("贵人/小人/与上级"), tone: "职场洞察",
    prohibited: ["引用不存在的贵人神煞(天乙/文昌等未提供)"], dependencies: ["职业方向"], validation: {},
  },
  {
    id: "一生事业轨迹", section: "career", order: 4, title: "逐大运的事业十年定调",
    inputData: ["facts.dayun"],
    triggerConditions: "按大运排盘逐运输出;当前大运必须标注「,当前」;喜忌与冲合刑害决定各运基调",
    interpretationRules: [
      "格式:XX大运（年龄范围）:XX分。事业应期: 十年定调+具体展开+注意事项",
      "每步大运都必须打分,分数结合引擎参考分(±5内)",
      "关键转折运加⚠️直说(黄金爆发期/重大转向)",
    ],
    evidence: ["area.career"],
    writingStructure: "逐大运条目(干支+年龄+评分+断语),当前大运标注",
    lengthLimit: limit("一生事业轨迹"), tone: "十年断语",
    prohibited: ["编造排盘之外的大运", "跳过中间大运", "断言必然升职/失业"],
    dependencies: ["职业方向"], validation: { quantifiedFormat: "score-per-item", mustCiteGanzhi: true },
  },
  {
    id: "近期流年事业", section: "career", order: 5, title: "未来十年逐年事业动向",
    inputData: ["facts.annual"],
    triggerConditions: "按流年排盘逐年输出;逢换运头年加大运交接标记;高光/蛰伏年直说",
    interpretationRules: [
      "格式:YYYY年（干支）· 评分XX分:年度动向与行动指南",
      "每年必须打分(结合引擎参考分±5);换运头年加〔行X大运⚠️换运头1年〕标记",
      "年初立春交界年份按排盘注记表述",
    ],
    evidence: ["area.career"],
    writingStructure: "逐年条目(年份+干支+评分+动向),区间止于流年排盘末年",
    lengthLimit: limit("近期流年事业"), tone: "年度断语",
    prohibited: ["编造区间外年份", "断言必然结果"], dependencies: ["一生事业轨迹"], validation: { quantifiedFormat: "score-per-item", mustCiteGanzhi: true },
  },

  // ── 05 wealth 财富(4) ──
  {
    id: "一生财富高度", section: "wealth", order: 1, title: "引擎定档的财富量级与推导链披露",
    inputData: ["anchors.wealthTier"],
    triggerConditions: "档位/区间/推导链全部由引擎确定性计算(同盘同值),AI 只解释链为什么成立",
    interpretationRules: [
      "content 首行必须原样输出:以下为纯天赋计算值,未考虑地域/家庭/社会等因素影响,仅供参考。",
      "量级结论:你的财富量级在 X–X 之间,括号内写档位对应具体数字(如 1000万-3000万),禁用模糊词",
      "按 wealth.tier 推导链如实披露(基准分与加减档理由),不得改档、不得另算、不得使用区间外数字",
    ],
    evidence: ["area.wealth-tier"],
    writingStructure: "免责首行(原样) → 量级结论 → 推导链逐条 → 结构解读",
    lengthLimit: limit("一生财富高度"), tone: "披露式、克制",
    prohibited: ["改档/另算/区间外数字", "千万级等模糊词", "断言必然达成"],
    dependencies: ["旺衰定性"], validation: { quantifiedFormat: "wealth-tier", requireQuoteMark: true },
  },
  {
    id: "主要获财方式", section: "wealth", order: 2, title: "获财结构与变现路径",
    inputData: ["anchors.tenGods", "anchors.strength", "area.wealth-tier"],
    triggerConditions: "财星透藏+食伤通道+身强弱决定获财结构;比劫旺为忌必须写合伙警示",
    interpretationRules: ["强断语开头(如你绝不是靠死工资发财的人——需有盘面依据)", "点出获财结构(食伤生财/财星透干/官印俸禄等)与变现路径", "比劫为忌时必须写强烈规避合伙、比劫夺财警示"],
    evidence: ["tenGod", "area.wealth-tier"],
    writingStructure: "断语 → 结构依据 → 变现路径 → 合伙警示(若比劫为忌)",
    lengthLimit: limit("主要获财方式"), tone: "财务顾问式断语",
    prohibited: ["推荐具体金融产品", "断言暴富"], dependencies: ["一生财富高度"], validation: {},
  },
  {
    id: "一生财富大运", section: "wealth", order: 3, title: "逐大运的财运十年状态",
    inputData: ["facts.dayun", "anchors.fuYong"],
    triggerConditions: "大运干支财星/喜忌覆盖决定各运财运状态;黄金十年与消耗十年直说",
    interpretationRules: ["格式:XX大运（年龄范围）:财运状态（↑↑/↑/→/↓/↓↓）。财务象: 具体描述", "每运必须给趋势符号;黄金十年直说"],
    evidence: ["area.wealth-tier"],
    writingStructure: "逐大运条目(干支+年龄+趋势+财务象)",
    lengthLimit: limit("一生财富大运"), tone: "十年断语",
    prohibited: ["编造大运", "推荐具体投资标的"], dependencies: ["一生财富高度"], validation: { mustCiteGanzhi: true },
  },
  {
    id: "近期财富流年", section: "wealth", order: 4, title: "未来十年逐年财务建议",
    inputData: ["facts.annual"],
    triggerConditions: "流年财星/忌神/冲合决定年度标签;标签要有辨识度(破财高发年/攒钱黄金年等)",
    interpretationRules: ["格式:YYYY年（干支）· 6-8字年度标签:具体财务建议", "暴富年/破财年直接点明,建议具体(捂紧钱包/见好就收/切忌加杠杆)"],
    evidence: ["area.wealth-tier"],
    writingStructure: "逐年条目(年份+干支+标签+建议)",
    lengthLimit: limit("近期财富流年"), tone: "年度断语",
    prohibited: ["编造年份", "具体投资标的推荐"], dependencies: ["一生财富大运"], validation: { mustCiteGanzhi: true },
  },

  // ── 06 relationship 感情(5) ──
  {
    id: "配偶特征", section: "relationship", order: 1, title: "配偶星+夫妻宫的配偶画像",
    inputData: ["area.spouse", "facts.pillars"],
    triggerConditions: "配偶星五行(男命财星/女命官杀)定长相气质取象;配偶星十神定性格;力量与根气定独立能力;喜忌定旺你与否",
    interpretationRules: [
      "分五行:长相/气质(按配偶星五行取象:木=挺拔清秀、火=立体热情、土=稳重敦厚、金=干练清冷、水=灵动圆润)/性格(十神)/个人能力(力量与根气)/能否旺你(喜忌)/另一半职业方向(以配偶星为太极点,注明仅供参考)",
    ],
    evidence: ["area.spouse"],
    writingStructure: "长相/气质:… / 性格:… / 个人能力:… / 能否旺你:… / 另一半职业方向:…",
    lengthLimit: limit("配偶特征"), tone: "人物画像",
    prohibited: ["断言对方真实职业", "把桃花神煞直接推断为外遇"], dependencies: [], validation: {},
  },
  {
    id: "对方家庭/配偶父母", section: "relationship", order: 2, title: "对方原生家庭条件与父母画像",
    inputData: ["area.spouse", "facts.pillars", "facts.relationTexts"],
    triggerConditions: "夫妻宫(日支)藏干十神+喜忌论对方家庭;年柱藏干对应其父母存在感;男命称岳父岳母、女命称公公婆婆",
    interpretationRules: ["先按夫妻宫十神喜忌论对方家庭条件与帮衬(忌神时直说条件普通、帮衬有限)", "再按具体柱位藏干写对方父母各自的存在感与性格"],
    evidence: ["area.spouse", "chart.pillar-1"],
    writingStructure: "家庭条件与帮衬 → 对方父母(具体柱位依据)",
    lengthLimit: limit("对方家庭/配偶父母"), tone: "家庭观察",
    prohibited: ["断言对方家庭必然如何"], dependencies: ["配偶特征"], validation: {},
  },
  {
    id: "婚姻稳定性", section: "relationship", order: 3, title: "婚姻稳定倾向与经营处方",
    inputData: ["area.spouse", "facts.relationTexts", "anchors.tenGods"],
    triggerConditions: "夫妻宫冲刑合害+配偶星状态+比劫旺衰决定稳定性档位;有具体冲刑必须引用",
    interpretationRules: ["先给结论:你的婚姻稳定性偏X（较高/中等需多维护）", "引用具体冲刑合害(如日支与年支相刑);无比劫问题不写比劫提醒", "末尾给具体处方(沟通/财务隔离/个人空间)"],
    evidence: ["area.spouse", "relation"],
    writingStructure: "稳定性结论 → 盘面依据(具体关系) → 处方",
    lengthLimit: limit("婚姻稳定性"), tone: "克制、不吓人",
    prohibited: ["断言必然离婚/出轨", "无依据写婚姻危机"], dependencies: ["配偶特征"], validation: { quantifiedFormat: "marriage-level", requireQuoteMark: true },
  },
  {
    id: "一生婚恋大运", section: "relationship", order: 4, title: "逐大运的感情十年定调",
    inputData: ["facts.dayun", "area.spouse"],
    triggerConditions: "大运干支十神(配偶星/食伤/比劫)+与日支冲合决定各运感情基调",
    interpretationRules: ["格式:XX大运（年龄范围）:天干X十神+地支X十神。该运感情描述", "最适合成婚的大运直说;最需防范的大运直说;晚年运可合并"],
    evidence: ["area.spouse"],
    writingStructure: "逐大运条目(干支+年龄+十神+断语)",
    lengthLimit: limit("一生婚恋大运"), tone: "十年断语",
    prohibited: ["断言必然结婚/破裂的年份"], dependencies: ["配偶特征"], validation: { mustCiteGanzhi: true },
  },
  {
    id: "近期感情流年", section: "relationship", order: 5, title: "未来十年逐年感情动向(缘分概率)",
    inputData: ["facts.annual", "area.spouse"],
    triggerConditions: "流年配偶星状态+夫妻宫冲合决定缘分概率;概率为该章标准量化格式",
    interpretationRules: [
      "格式:YYYY年（干支）· 缘分概率XX%:状态提示",
      "概率按该年配偶星与夫妻宫状态在20%-90%取值;夫妻宫逢冲合的年份加〔夫妻宫冲合〕标记",
      "正缘强的年份直说(适合确认关系/推进婚姻)",
    ],
    evidence: ["area.spouse"],
    writingStructure: "逐年条目(年份+干支+概率+状态),区间止于流年排盘末年",
    lengthLimit: limit("近期感情流年"), tone: "年度断语",
    prohibited: ["概率区间外取值", "断言必然结婚/分手"], dependencies: ["一生婚恋大运"], validation: { quantifiedFormat: "love-probability", mustCiteGanzhi: true },
  },

  // ── 07 wellbeing 健康(2) ──
  {
    id: "身体薄弱器官", section: "wellbeing", order: 1, title: "五行偏枯对应的脏腑系统倾向",
    inputData: ["facts.wuXing", "anchors.dominantElement", "anchors.missingElements"],
    triggerConditions: "过旺与被克的五行对应脏腑为薄弱系统;缺五行次之;每个系统单独「」括注",
    interpretationRules: [
      "按五行-脏腑对应(木=肝胆/火=心血/土=脾胃/金=呼吸/水=肾与泌尿)写偏枯",
      "写具体倾向症状(消化/睡眠/疲劳类),只写倾向",
      "结尾一句:你一生中最需要注意的是X和X系统,「」逐个括注",
    ],
    evidence: ["chart.elements"],
    writingStructure: "过旺系统及其表现 → 被克/偏弱系统 → 收束句(「」括注)",
    lengthLimit: limit("身体薄弱器官"), tone: "养生提醒",
    prohibited: ["疾病诊断", "断言必然患病", "医药推荐"], dependencies: [], validation: { requireQuoteMark: true },
  },
  {
    id: "心理健康倾向", section: "wellbeing", order: 2, title: "十神结构的心理底色与调适",
    inputData: ["anchors.tenGods", "anchors.strength"],
    triggerConditions: "主导十神+缺失/过旺十神决定情绪模式(急躁/焦虑/内耗);身强弱影响承压方式",
    interpretationRules: ["先写心理底色(自信/要强/思维活跃等)", "写高压情境下的情绪倾向+一句画面感描述", "末尾给一个可执行的调适建议"],
    evidence: ["tenGod.1"],
    writingStructure: "心理底色 → 情绪倾向(高压情境) → 调适建议",
    lengthLimit: limit("心理健康倾向"), tone: "温和洞察",
    prohibited: ["心理疾病诊断", "绝对化心理定性"], dependencies: [], validation: {},
  },

  // ── 08 children 子女(3) ──
  {
    id: "子女缘分", section: "children", order: 1, title: "子女星状态的缘分深浅",
    inputData: ["area.children"],
    triggerConditions: "子女星(男命官杀/女命食伤)力量与喜忌决定缘分档位;时柱为子女宫(三柱盘无时柱则以星论)",
    interpretationRules: ["直接给结论「缘分很深/适中/偏晚偏淡」", "写子女的才华特质与和你关系的亲密度(以星性与喜忌为据)"],
    evidence: ["area.children"],
    writingStructure: "缘分结论(「」) → 依据(子女星状态) → 特质与亲密度",
    lengthLimit: limit("子女缘分"), tone: "温和",
    prohibited: ["断言子女数量", "无时柱盘虚构时柱宫位"], dependencies: [], validation: { requireQuoteMark: true },
  },
  {
    id: "子女性别倾向", section: "children", order: 2, title: "子女性别的传统倾向(带准确率标注)",
    inputData: ["area.children"],
    triggerConditions: "按命法依据(男命看官杀/女命看食伤)的具体十神状态(如正官透出且合身)给倾向",
    interpretationRules: ["写明命法依据+引用具体十神状态", "给出倾向判断(倾向于生女孩/男孩的概率稍大)", "句末统一标注:(准确率约60-70%,仅供参考)"],
    evidence: ["area.children"],
    writingStructure: "命法依据 → 倾向结论 → 准确率标注",
    lengthLimit: limit("子女性别倾向"), tone: "克制、明确标注局限",
    prohibited: ["断言一定生男/生女", "缺时柱时虚构宫位依据"], dependencies: ["子女缘分"], validation: { quantifiedFormat: "gender-lean" },
  },
  {
    id: "子女发展", section: "children", order: 3, title: "子女宫与子女星的子女发展倾向",
    inputData: ["area.children", "anchors.fuYong"],
    triggerConditions: "时柱十神喜忌(三柱盘以子女星喜忌替代)决定子女独立性与晚年回馈",
    interpretationRules: ["写子女独立发展程度", "写晚年经济与生活层面的孝顺回馈倾向(以宫星喜忌为据,不断言)"],
    evidence: ["area.children"],
    writingStructure: "独立性 → 晚年回馈倾向",
    lengthLimit: limit("子女发展"), tone: "温和", prohibited: ["断言子女成就"], dependencies: ["子女缘分"], validation: {},
  },

  // ── 09 family 六亲(3) ──
  {
    id: "父亲", section: "family", order: 1, title: "偏财星状态的父亲画像",
    inputData: ["area.parents", "facts.pillars", "anchors.fuYong"],
    triggerConditions: "偏财星的藏透柱位+喜忌决定父亲缘分与助力;须引用具体柱位藏干",
    interpretationRules: ["写偏财星状态与柱位(如偏财藏在月支本气)", "结合喜忌给结论:缘分深浅、父亲能力、关键节点的资助与启发维度"],
    evidence: ["area.parents"],
    writingStructure: "星状态与柱位 → 缘分与能力结论 → 现实助力的具体维度",
    lengthLimit: limit("父亲"), tone: "家庭观察", prohibited: ["断言父亲必然如何"], dependencies: [], validation: {},
  },
  {
    id: "母亲", section: "family", order: 2, title: "正印星状态的母亲画像",
    inputData: ["area.parents", "facts.pillars", "anchors.fuYong"],
    triggerConditions: "正印(或偏印)的透藏+喜忌决定母亲参与度(支持庇护/操心干涉/参与度低);原局不显须明说",
    interpretationRules: ["写印星状态(透干/藏于何支/原局不显)", "给结论:缘分厚薄、关爱模式,落到与母亲相处的现实样貌;弱缘直说(更多靠自己独立打拼)"],
    evidence: ["area.parents"],
    writingStructure: "星状态 → 关爱模式 → 相处样貌",
    lengthLimit: limit("母亲"), tone: "家庭观察", prohibited: ["断言母亲必然如何"], dependencies: [], validation: {},
  },
  {
    id: "兄弟姐妹", section: "family", order: 3, title: "比劫喜忌的同辈关系",
    inputData: ["area.siblings", "anchors.tenGods"],
    triggerConditions: "比劫喜忌+权重决定同辈关系基调(竞争攀比/互相扶持);为忌时写保持距离建议",
    interpretationRules: ["先写比劫喜忌与权重", "给结论:易出现的相处情形(竞争资源/互相帮扶)、能否得到实质帮助", "相处建议(为忌:保持适当距离;为喜:帮扶与合伙方向)"],
    evidence: ["area.siblings"],
    writingStructure: "比劫状态 → 相处情形 → 建议",
    lengthLimit: limit("兄弟姐妹"), tone: "平实", prohibited: ["断言同辈必然如何"], dependencies: [], validation: {},
  },
];

/** 章内字段按声明顺序取用 */
export function fieldSpecsOfSection(section: SectionKey): FieldSpec[] {
  return FIELD_SPECS.filter((spec) => spec.section === section).sort((a, b) => a.order - b.order);
}

/** 35 字段总数守恒断言(结构基准,不增不减) */
export const FIELD_COUNT = FIELD_SPECS.length;
