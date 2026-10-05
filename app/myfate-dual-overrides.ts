// 双星合盘精校内容覆盖:用户提供定稿文案时按组合键命中,页面优先渲染;
// 未命中的组合仍走引擎+AI 生成链路。文案为权威内容,渲染层不得改写。

export type DualOverrideContent = {
  keywords: string[];
  summary: string;
  overview: { coreTone: string; strongestSupport: string; needsCare: string };
  communication: {
    himPattern: { label: string; text: string };
    herPattern: { label: string; text: string };
    conflictScenes: string;
    himAdvice: { label: string; text: string };
    herAdvice: { label: string; text: string };
  };
  mutualInfluence: { himOnHer: string; herOnHim: string; closeupFeel: string };
  keyJudgments: Array<{ question: string; answer: string }>;
  futureRhythm: {
    timeRange: { startYear: number; endYear: number } | null;
    supportivePeriods: Array<{ startYear: number; endYear: number; label: string; detail: string }>;
    pressurePeriods: Array<{ startYear: number; endYear: number; label: string; detail: string }>;
  };
  finalAdvice: { keepWays: string; priorityFix: string; pressureHim: string; pressureHer: string; pressureBoth: string };
};

// 组合键:两位明星 id 排序后拼接,与建报告时的 canonical 顺序一致
export function dualOverrideKey(starA: string, starB: string) {
  return [starA, starB].sort().join("|");
}

const JIN_RM: DualOverrideContent = {
  keywords: ["水火调候", "病药相成", "大局互补", "边界感"],
  summary: "宏观互为解药的高契合组合:大局高度滋养,微观需要空间与钝感力。",
  overview: {
    coreTone:
      "这是一组在宏观能量层面上互为强效“解药”，但在微观朝夕相处时极需心理边界的高契合度组合。男方原局烈火焦土，急需清凉丰盈之水润局以舒缓紧绷神经；女方原局早春水木森寒，正需要温厚明朗之火土来驱散内在阴翳与不安全感。两人的结合具有强烈的命运互补性与宿命吸引力。然而，男方夫妻宫坐比肩厚土，女方夫妻宫坐正官深水，土水相凌，一旦距离拉得过近、试图在生活细节上彻底改造彼此，就会引发隐蔽而执拗的攻防拉扯。因此，关系的本质是“大局高度滋养，微观需要空间与钝感力”。",
    strongestSupport:
      "大局层面展现出精准的“病药相成”。女方年月干壬癸齐透、坐支亥水，水气磅礴，能够源源不断地带走男方命局中的焦灼燥气，让男方感到踏实宁静、心智清明；男方通盘丁午丙未火土成象，能将女方原局中容易郁结的官杀水木寒气彻底烤暖，赋予女方极度缺乏的生命元气与行动勇气。在婚姻价值观层面，男方坐比肩重义气担当，女方坐正官主克制体统，双方对家庭的底线意识均极高，具备长线结盟的道德与忠诚基底。",
    needsCare:
      "微观夫妻宫的气场碰撞构成了核心消耗点。男方日支为未土燥土，女方日支为亥水寒水。在同一屋檐下的琐碎日常中，未土自带强势、固执的比肩防线，遇到矛盾时容易就事论事、硬扛冷化；而亥水代表的女方，内在细腻敏锐、极度在乎态度温差与情绪共振。男方的未土会本能地去克制、围堵女方的亥水，导致女方感到自己的感受被“就地掩埋”；而女方的持续反刍与探究，又会无意中激发男方最讨厌的被控制感。",
  },
  communication: {
    himPattern: {
      label: "男方（外在温和讲理 vs 内在刚硬防御）",
      text: "天干透壬水正官、丁丙印星，外在表现常显温良、谦逊、富有条理与社会教养；但地支未未两重、暗藏羊刃比肩，骨子里吃软不吃硬，自尊心极强。一旦感到被指责或强行纠正，内在的比肩防御机制会瞬间启动，迅速退回自己的沉默壁垒中，进入“软抵抗”或“冰封”状态。",
    },
    herPattern: {
      label: "女方（外在顺从克制 vs 内在敏感焦虑）",
      text: "天干官杀并透、甲木正印护身，外在展现为懂礼数、顾大局、擅于隐忍退让；但坐下亥水官星、月令卯木偏印，内在心思极其幽微缜密。当分歧发生时，她容易将具体的事务上升到“你是否还重视我”的依恋危机，习惯用层层追问或冷淡试探来索求确定感。",
    },
    conflictScenes:
      "典型的“逻辑说理 vs 情绪回应”碰撞。例如在安排假期行程或家庭开销等决策时，女方因对细节的安全感需求提出担忧，男方习惯以“这有什么好担心的，按规则/理性办就行”进行事实层面终结。女方感知到男方的态度缺乏温度，随即收起话茬、以冷淡和微表情表达不满；男方则觉得女方不可理喻、无事生非，索性彻底闭口不言，双双陷入窒息的“冷暴力死锁”。",
    himAdvice: {
      label: "给男方的建议（先接住情绪，再给解决方案）",
      text: "女方的追问并非质疑你的能力，而是其水木寒湿格局带来的防御性焦虑。面对她的不安，切忌用大道理强压，先肯定她的情绪感受（如“我知道这事让你有些烦躁”），她的水气自会被安抚，无需动用未土去硬克。",
    },
    herAdvice: {
      label: "给女方的建议（直接表达需求，严禁言语试探）",
      text: "男方的比肩骨子里讨厌被指令与翻旧账。有诉求时，直接以客观事实与具体动作提出（如“我需要你帮我处理A环节”），避免使用带有情绪评判的否定式反问，给他留足男性的领地感与尊重。",
    },
  },
  mutualInfluence: {
    himOnHer:
      "男方的火土纯阳之气，能极大程度化解女方潜意识中的自我怀疑与内耗，破除她因水木过盛而带来的行动拖延，赋予她面对现实世界的底气与阳光感。但在极近距离同处时，男方未经消化的固执与情绪钝感，容易无意间刺伤女方的细腻神经。",
    herOnHim:
      "女方的清冽水汽能够迅速降下男方的焦火，促使他在事业与现实决策中摆脱盲目冲动，变得深思熟虑、懂得迂回；女方的陪伴能为男方提供深层的心灵清凉。但若女方长期陷入消极幽怨的情绪中，也会放大男方内在隐匿的逃避与厌烦。",
    closeupFeel:
      "典型呈现出“分开时彼此惦念、合体时容易摩擦”的体感。双方在外人看来是极其互补、相敬如宾的模范伴侣，但若整天腻在同一个密闭空间内，男方会觉得缺乏独处自由，女方会觉得缺乏情感浓度。维持适度的心理边界与物理留白，是这组关系保持高质量互动的生命线。",
  },
  keyJudgments: [
    { question: "彼此是滋养还是消耗", answer: "高度滋养。大局上五行“燥湿相济、水火调候”，双方核心气场正是对方命中所求之物，属于典型的深层互补型组合。" },
    { question: "婚姻关系的稳定底色", answer: "有利。男方正偏印生身有制、重责任，女方官印相生守规矩，二人对婚姻制度的承诺感均极重，不易出现原则性背叛或轻言放弃。" },
    { question: "贴近之后是否舒服", answer: "存在隐性消耗。夫妻宫燥土克寒水，近距离相处需刻意建立“不越界”的相处模式，距离产生美在这段关系中尤为适用。" },
    { question: "低谷时能否彼此托底", answer: "具备极强的错峰托底机制。男方目前正处庚戌大运（土重偏燥、承受现实磨砺），女方正走庚子大运（水旺引动用神），女方当前的运势能有效对冲男方的燥性；未来男方入辛亥、壬子水运时，男方的金水大运又反向化为女方的财官助力，形成良性接力。" },
    { question: "吸引力与相处张力", answer: "强吸引力与高心理张力并存。男方稳重持重的“厚重感”对缺乏安全感的女方有天然吸附力；女方的灵动与温柔又极易触动男方的保护欲，彼此在对方身上都能看到自己未曾拥有的特质。" },
    { question: "共同压力的风险点", answer: "2026年（丙午）至2027年（丁未）。这两年火土极旺，直击男方的火土忌神、激化其内在固执与现实焦虑，同时未土流年重叠男方夫妻宫并穿害克制女方日支亥水。双方在此阶段均易情绪易燃、耐受力下降，属于极易爆发家庭争吵的共振承压期。" },
  ],
  futureRhythm: {
    timeRange: { startYear: 2026, endYear: 2045 },
    supportivePeriods: [
      {
        startYear: 2028,
        endYear: 2033,
        label: "可相互支持的阶段",
        detail: "流年转入金水旺地，男方行至戌运尾声渐入佳境，女方水运得金生，双方法力归位、沟通顺畅。此阶段非常适合共同购置资产、拓展事业蓝图或完成家庭重大进阶，女方可主导内部规划，男方负责外部攻坚。",
      },
    ],
    pressurePeriods: [
      {
        startYear: 2026,
        endYear: 2027,
        label: "需要降低关系压力的阶段",
        detail: "火土烈度拉满，双方宜主动“降温”。在重大投资、买房或深度家庭决策上宜采取守势，各自保留充沛的个人兴趣空间，避免因鸡毛蒜皮的家务琐事触发夫妻宫的土水相战。",
      },
    ],
  },
  finalAdvice: {
    keepWays: "各司其职，大格局上的彼此托举。发挥双方五行大局调候的互补优势，在人生方向与大事件上互相商量，男方借女方的冷静避险，女方借男方的定力成事。",
    priorityFix: "戒断“冷战”与“过度解读”的恶性循环。打破“女方试探/抱怨 -> 男方防御闭合 -> 女方愤怒焦虑 -> 男方彻底逃避”的行为回路，降低对彼此微表情的过度归因。",
    pressureHim: "在情绪上头时，严禁使用摔门而去或彻底断联的硬着陆方式；若需冷静，明确告知女方“我需要独处30分钟平复思路，不是不在乎你”。",
    pressureHer: "克制刨根问底与延伸审判的冲动，就事论事；当男方展现出沉默迹象时，停止情绪输出，给予他消化自我防御的安全缓冲区。",
    pressureBoth: "在2026–2027等火土承压年份，确立“不把工作与外界压力转化成对伴侣的挑剔”之底线，遇重大分歧搁置24小时后再做沟通。",
  },
};

export const DUAL_OVERRIDES: Record<string, DualOverrideContent> = {
  [dualOverrideKey("jin", "rm")]: JIN_RM,
};

export function getDualOverride(starA: string, starB: string): DualOverrideContent | undefined {
  return DUAL_OVERRIDES[dualOverrideKey(starA, starB)];
}
