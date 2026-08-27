export type Dimension =
  | "security"
  | "expression"
  | "independence"
  | "conflict"
  | "novelty";

export type StarProfile = {
  id: string;
  name: string;
  role: string;
  tagline: string;
  description: string;
  relationshipStyle: string;
  focus: string;
  mbti: string;
  birthDate: string;
  threePillars: string;
  traits: string[];
  categories?: string[];
  matchCount: string;
  portraitSrc: string;
  ideal: Record<Dimension, number>;
  reportPrompt?: string;
};

export type TestOption = {
  label: string;
};

export type TestQuestion = {
  id: string;
  dimension: Dimension;
  question: string;
  eyebrow?: string;
  options: TestOption[];
};

export const dimensionLabels: Record<Dimension, string> = {
  security: "安全感",
  expression: "情感表达",
  independence: "独立空间",
  conflict: "冲突沟通",
  novelty: "新鲜体验",
};

export function createDefaultCelebrityReportPrompt(star: StarProfile) {
  return `你正在解读的目标人物是 ${star.name}（${star.role}）。
人物基准：${star.tagline}。${star.description}
亲密关系倾向：${star.relationshipStyle}；重点关注：${star.focus}。
可参考的人物资料：MBTI 为 ${star.mbti}，三柱为 ${star.threePillars}。
请把以上内容只作为目标人物的解读背景，结合测试题、全部选项和用户实际选择，分析用户与 TA 相处时的具体互动。不要虚构私生活或真实恋爱经历，也不要把 MBTI 与三柱表述成科学定论。`;
}

export const stars: StarProfile[] = [
  {
    id: "bang-chan",
    name: "Bang Chan",
    role: "艺人 · 舞台创作者",
    tagline: "热烈负责，也会把柔软藏进照顾里",
    description:
      "ENFJ 的外向共情与戊土日主的承接力，让 TA 很自然地成为关系里的发起者和守护者。TA 会主动确认感受、安排未来，也容易把责任扛在自己身上；真正需要的是一个愿意回应热情、也能提醒 TA 放松的人。",
    relationshipStyle: "主动守护的共建型",
    focus: "真诚回应 · 共同成长 · 稳定承诺",
    mbti: "ENFJ",
    birthDate: "1997-10-03",
    threePillars: "丁丑 · 己酉 · 戊寅",
    traits: ["引领", "温暖", "担当"],
    matchCount: "12,680",
    portraitSrc: "/bang-chan.webp",
    ideal: { security: 84, expression: 90, independence: 55, conflict: 84, novelty: 65 },
  },
  {
    id: "hyunjin",
    name: "Hyunjin",
    role: "艺人 · 舞台创作者",
    tagline: "感受浓烈，期待灵魂先于语言相认",
    description:
      "INFP 的理想主义遇上丁火日主的细腻光感，让 TA 对氛围、真心和关系里的微小变化格外敏锐。TA 不一定立刻说出全部感受，却会在确认安全后投入很深；比起标准答案，更在意你是否真正理解那些没有说出口的部分。",
    relationshipStyle: "灵魂共鸣的慢热型",
    focus: "情绪理解 · 审美共鸣 · 不被催促",
    mbti: "INFP",
    birthDate: "2000-03-20",
    threePillars: "庚辰 · 己卯 · 丁丑",
    traits: ["浪漫", "敏锐", "深情"],
    matchCount: "18,240",
    portraitSrc: "/hyunjin.webp",
    ideal: { security: 78, expression: 72, independence: 68, conflict: 62, novelty: 82 },
  },
  {
    id: "james",
    name: "James",
    role: "艺人 · 舞台创作者",
    tagline: "冷静观察，只为真正有趣的人打开自己",
    description:
      "INTP 的分析倾向与辛金日主的精细判断，让 TA 习惯先观察、理解，再决定是否靠近。TA 不依赖高频表达证明感情，却很重视观点能否碰撞、边界是否被尊重；一旦认定，会用持续关注和解决问题表达在意。",
    relationshipStyle: "脑力共振的慢热型",
    focus: "思想交流 · 独立空间 · 言行一致",
    mbti: "INTP",
    birthDate: "2005-10-14",
    threePillars: "乙酉 · 丙戌 · 辛未",
    traits: ["理性", "克制", "精准"],
    matchCount: "9,760",
    portraitSrc: "/james.webp",
    ideal: { security: 58, expression: 42, independence: 92, conflict: 78, novelty: 75 },
  },
  {
    id: "juhoon",
    name: "Juhoon",
    role: "艺人 · 舞台创作者",
    tagline: "跟着感觉靠近，在舒服的陪伴里慢慢认真",
    description:
      "ISFP 的感受力与壬水日主的流动性，让 TA 更相信当下相处的真实体感。TA 喜欢自然发生的靠近，不爱被关系规则束缚；看似随性，实际上会默默记住你的情绪与习惯，并用陪伴而不是宣言表达认真。",
    relationshipStyle: "感受先行的陪伴型",
    focus: "相处舒服 · 尊重节奏 · 真实行动",
    mbti: "ISFP",
    birthDate: "2008-01-03",
    threePillars: "丁亥 · 壬子 · 壬寅",
    traits: ["随性", "细腻", "自由"],
    matchCount: "15,320",
    portraitSrc: "/juhoon.webp",
    ideal: { security: 68, expression: 64, independence: 82, conflict: 58, novelty: 88 },
  },
  {
    id: "keonho",
    name: "Keonho",
    role: "艺人 · 舞台创作者",
    tagline: "独立直接，喜欢一起拆解未知世界",
    description:
      "INTP 的探索欲与庚金日主的直接感，让 TA 对新观点很有兴趣，也很重视逻辑与自主判断。TA 不喜欢过度试探，遇到问题更愿意一起找答案；亲密对 TA 而言不是失去空间，而是拥有一个能够并肩探索的人。",
    relationshipStyle: "边界清晰的探索型",
    focus: "坦率沟通 · 自主空间 · 共同解题",
    mbti: "INTP",
    birthDate: "2009-02-14",
    threePillars: "己丑 · 丙寅 · 庚寅",
    traits: ["独立", "直接", "好奇"],
    matchCount: "11,590",
    portraitSrc: "/keonho.webp",
    ideal: { security: 60, expression: 45, independence: 94, conflict: 76, novelty: 82 },
  },
  {
    id: "seonghyeon",
    name: "Seonghyeon",
    role: "艺人 · 舞台创作者",
    tagline: "安静而坚定，认定之后更相信长期行动",
    description:
      "INTP 的内在思考与戊土日主的稳定底色，让 TA 在关系里更倾向先确认价值观，再投入长期行动。TA 表面克制，不会用夸张表达制造安全感，却会通过守约、解决问题和持续出现证明在意。",
    relationshipStyle: "安静可靠的长期型",
    focus: "稳定兑现 · 尊重边界 · 深度交流",
    mbti: "INTP",
    birthDate: "2009-01-13",
    threePillars: "戊子 · 乙丑 · 戊午",
    traits: ["稳定", "内敛", "坚定"],
    matchCount: "20,410",
    portraitSrc: "/seonghyeon.webp",
    ideal: { security: 74, expression: 40, independence: 88, conflict: 82, novelty: 60 },
  },
];

export function createInitialQuestions(star: StarProfile): TestQuestion[] {
  const [, , thirdTrait] = star.traits;
  const pressureScenario: Record<string, string> = {
    "bang-chan": "忙完团队的事，嘴上还说“没事”",
    hyunjin: "作品不顺，嘴上还说“没事”",
    james: "钻研太久，差点忘了休息",
    juhoon: "临时改完安排，有点疲惫",
    keonho: "沉浸在新想法里，忘了休息",
    seonghyeon: "扛下很多事，却一句没抱怨",
  };
  const affectionMoment: Record<string, string> = {
    "bang-chan": "在后台没人时，轻轻亲了你的额头",
    hyunjin: "分别前，忽然亲了你的额头",
    james: "聊天停下时，轻轻亲了你的额头",
    juhoon: "人群散去后，忽然牵住你的手",
    keonho: "并肩走路时，忽然牵住你的手",
    seonghyeon: "送你回家时，忽然牵住你的手",
  };
  const templates: TestQuestion[] = [
  {
    id: "idol-pressure",
    "dimension": "security",
    "question": "Bang Chan忙完之后，转头靠在你肩上，你会怎么做？",
    "options": [
      {
        "label": "先抱住：累了就说，我在呢",},
      {
        "label": "别嘴硬了，今天必须休息",},
      {
        "label": "问题不大，TA 自己能缓过来",},
      {
        "label": "抱一下，不想说就先不说",}
    ]
  },
  {
    id: "idol-silence",
    "dimension": "expression",
    "question": "Bang Chan低声说：“和你待着就好”，你会？",
    "options": [
      {
        "label": "怎么了怎么了？",},
      {
        "label": "那就待着",},
      {
        "label": "假装没听见",},
      {
        "label": "先陪一会儿",}
    ]
  },
  {
    id: "idol-focus",
    "dimension": "independence",
    "question": "Bang Chan深夜说想见你，但你明早有事。你会怎么做？",
    "options": [
      {
        "label": "商量今晚先视频，明晚见面",},
      {
        "label": "直接开冲",},
      {
        "label": "已读不回",},
      {
        "label": "问清楚怎么了",}
    ]
  },
  {
    id: "idol-disagreement",
    "dimension": "conflict",
    "question": "约会时，你和Bang Chan聊未来聊崩了。你会？",
    "options": [
      {
        "label": "先别急，我想听听你怎么想",},
      {
        "label": "不想吵，先说你对你对",},
      {
        "label": "这题我必须掰扯赢",},
      {
        "label": "先暂停，等会儿再好好聊",}
    ]
  },
  {
    id: "idol-surprise",
    "dimension": "novelty",
    "question": "Bang Chan突然约你去秘密地点，会打乱计划。你会？",
    "options": [
      {
        "label": "先发定位，能赶上我就来",},
      {
        "label": "去去去，原计划先放一边",},
      {
        "label": "不去，临时改计划真的很烦",},
      {
        "label": "你自己玩吧，我就不去了",}
    ]
  },
  {
    id: "idol-care",
    "dimension": "expression",
    "question": "Bang Chan送来你随口提过的礼物。你会？",
    "options": [
      {
        "label": "救命，你居然真的记得！",},
      {
        "label": "当场尖叫，情绪价值给满",},
      {
        "label": "收下，改天也偷偷给 TA 惊喜",},
      {
        "label": "先搜一下这个多少钱",}
    ]
  },
  {
    id: "idol-boundary",
    "dimension": "independence",
    "question": "Bang Chan说今晚想一个人待着。你会？",
    "options": [
      {
        "label": "好呀，明天记得来找我",},
      {
        "label": "嘴上答应，手上狂刷动态",},
      {
        "label": "完了，TA 是不是不爱了",},
      {
        "label": "行，我也快乐过自己的晚上",}
    ]
  },
  {
    id: "idol-publicity",
    "dimension": "security",
    "question": "Bang Chan不能公开靠近，只偷偷给你暗号。你会？",
    "options": [
      {
        "label": "不公开可以，别让我一直猜就行",},
      {
        "label": "能懂，但偶尔也想被偷偷偏爱",},
      {
        "label": "必须公开，不然算什么关系",},
      {
        "label": "TA 说怎样就怎样",}
    ]
  },
  {
    id: "idol-mistake",
    "dimension": "conflict",
    "question": "Bang Chan犯错后问：“你对我失望了吗？”你会？",
    "options": [
      {
        "label": "失望有一点，但我们一起改",},
      {
        "label": "没有没有，别难过了",},
      {
        "label": "那我就把问题一次说完",},
      {
        "label": "先哄好，事情晚点再说",}
    ]
  },
  {
    id: "idol-future",
    "dimension": "novelty",
    "question": "Bang Chan问：“几年后我们还在一起呢？”你会？",
    "options": [
      {
        "label": "想啊，那我们得一起认真点",},
      {
        "label": "几年太远了，先别想",},
      {
        "label": "肯定在啊，先把氛围拉满",},
      {
        "label": "希望在，我会慢慢证明",}
    ]
  },
  {
    id: "idol-unspoken",
    "dimension": "expression",
    "question": "Bang Chan连着几天回复很短，说只是累了。你会？",
    "options": [
      {
        "label": "是不是烦我了？现在说清楚",},
      {
        "label": "行，那我也消失几天",},
      {
        "label": "累就先休息，想聊再找我",},
      {
        "label": "感觉你有点不对，我怎么陪你？",}
    ]
  },
  {
    id: "idol-opportunity",
    "dimension": "independence",
    "question": "Bang Chan有个好机会，但你们会长期异地。你会？",
    "options": [
      {
        "label": "机会和我，只能选一个",},
      {
        "label": "嘴上支持，心里等 TA 补偿",},
      {
        "label": "你去吧，但我真的会舍不得",},
      {
        "label": "去追机会，我们把见面安排好",}
    ]
  },
  {
    id: "idol-repair",
    "dimension": "conflict",
    "question": "Bang Chan说想冷静一下，你却想马上解决。你会？",
    "options": [
      {
        "label": "不行，今天必须聊明白",},
      {
        "label": "那就冷战，看谁先低头",},
      {
        "label": "可以静静，但今晚得回我",},
      {
        "label": "好，晚点几点我们再聊？",}
    ]
  },
  {
    id: "idol-visibility",
    "dimension": "security",
    "question": "关系被外界猜测，Bang Chan压力很大。你会？",
    "options": [
      {
        "label": "直接公开，让大家别猜了",},
      {
        "label": "全听 TA 的，我没意见",},
      {
        "label": "先别回应外界，我们自己说清楚",},
      {
        "label": "先少见面，等风头过去",}
    ]
  },
  {
    id: "idol-rhythm",
    "dimension": "novelty",
    "question": "Bang Chan开始更喜欢吃饭、散步、安静陪伴。你会？",
    "options": [
      {
        "label": "不刺激了，是不是不爱了",},
      {
        "label": "日常可以，惊喜得 TA 负责",},
      {
        "label": "平淡也挺甜，偶尔浪漫一下",},
      {
        "label": "偶尔整点新体验，看 TA 反应",}
    ]
  },
  {
    id: "idol-values",
    "dimension": "security",
    "question": "你和Bang Chan的未来规划差很多。你会？",
    "options": [
      {
        "label": "有爱就行，以后自然会解决",},
      {
        "label": "总得有一个人彻底改变",},
      {
        "label": "先说哪些能让，哪些真不能",},
      {
        "label": "先各退一步，以后再说",}
    ]
  },
  {
    id: "idol-listening",
    "dimension": "expression",
    "question": "Bang Chan很挫败，但暂时不想听建议。你会？",
    "options": [
      {
        "label": "还是给方案，解决最重要",},
      {
        "label": "不知道说啥，赶紧换话题",},
      {
        "label": "好，我先听。想听建议再叫我",},
      {
        "label": "嗯嗯，我在，你继续说",}
    ]
  },
  {
    id: "idol-privacy",
    "dimension": "independence",
    "question": "Bang Chan让你选歌，私人消息突然弹出。你会？",
    "options": [
      {
        "label": "顺便看一眼，恋人不该有秘密",},
      {
        "label": "立刻划走，我只负责选歌",},
      {
        "label": "不看，但之后旁敲侧击",},
      {
        "label": "提醒 TA 来消息了，我没点开",}
    ]
  },
  {
    id: "idol-pattern",
    "dimension": "conflict",
    "question": "Bang Chan又忘了重要约定，还来抱你道歉。你会？",
    "options": [
      {
        "label": "翻旧账：你果然从没变",},
      {
        "label": "继续忍，时间久了会好的",},
      {
        "label": "先说说原因，我确实挺失望",},
      {
        "label": "抱可以，但这次准备怎么改？",}
    ]
  },
  {
    id: "idol-relocation",
    "dimension": "novelty",
    "question": "Bang Chan要长期搬去陌生城市，问你怎么办。你会？",
    "options": [
      {
        "label": "别去了，这段关系更重要",},
      {
        "label": "我跟你走，别的以后再说",},
      {
        "label": "先算算钱和工作，再决定怎么去",},
      {
        "label": "你先去，我再慢慢想办法",}
    ]
  },
  {
    id: "idol-consistency",
    "dimension": "security",
    "question": "Bang Chan联系变少，但重要时刻都在。你看重什么？",
    "options": [
      {
        "label": "每天消息数量不能少",},
      {
        "label": "TA 愿不愿意公开秀恩爱",},
      {
        "label": "关键时刻在，说过的也做到",},
      {
        "label": "我不主动，TA 会不会发现",}
    ]
  },
  {
    id: "idol-affection",
    "dimension": "expression",
    "question": "后台没人时，轻轻亲了你的额头。你会？",
    "options": [
      {
        "label": "太突然了，赶紧开玩笑岔开",},
      {
        "label": "表面淡定，等 TA 再主动",},
      {
        "label": "偷偷靠近一点，回应 TA",},
      {
        "label": "看着 TA 说：其实我也心动",}
    ]
  },
  {
    id: "idol-social-boundary",
    "dimension": "independence",
    "question": "Bang Chan说今晚只和老朋友聚会。你会？",
    "options": [
      {
        "label": "要求带上我，恋人不能被排除",},
      {
        "label": "答应，但整晚在线查岗",},
      {
        "label": "去吧，我今晚也有自己的快乐",},
      {
        "label": "没问题，回来分享八卦就行",}
    ]
  },
  {
    id: "idol-change-plan",
    "dimension": "novelty",
    "question": "Bang Chan临时想改掉筹备很久的旅行。你会？",
    "options": [
      {
        "label": "拒绝，攻略不能白做",},
      {
        "label": "都听 TA 的，我不提顾虑",},
      {
        "label": "先看看预算，划算就换",},
      {
        "label": "改动不大就冲一把",}
    ]
  }
];
  const questions = [
    `${star.name}${pressureScenario[star.id] ?? "忙完一件大事"}，靠在你肩上。你会怎么陪 TA？`,
    `${star.name}说：“和你待着就好。”你怎么回应？`,
    `${star.name}深夜说想见你，但你明早有事。你准备怎么安排？`,
    `约会时，你和${star.name}聊未来聊僵了。你想先说什么？`,
    `${star.name}临时约你去一个秘密地点，原计划会被打乱。你更可能怎么选？`,
    `${star.name}送来你随口提过的礼物。你的第一反应是什么？`,
    `${star.name}说今晚想一个人待着。你会给 TA 怎样的空间？`,
    `${star.name}不能公开靠近，只能偷偷给你暗号。这会让你在意什么？`,
    `${star.name}犯错后问：“你对我失望了吗？”你会先安慰，还是先谈问题？`,
    `${star.name}问：“几年后我们还会在一起吗？”你会怎么回答？`,
    `${star.name}连续几天回复很短，只说自己累了。你准备怎么靠近？`,
    `${star.name}得到一个好机会，但你们会长期异地。你会怎么和 TA 商量？`,
    `${star.name}想先冷静，你却想马上解决。你想现在谈，还是晚点再说？`,
    `外界开始猜测你们的关系，${star.name}压力很大。你最先考虑什么？`,
    `${star.name}更喜欢吃饭、散步和安静陪伴。这样的日常你适应吗？`,
    `你和${star.name}的未来计划差很多。你会先谈哪部分？`,
    `${star.name}很挫败，但暂时不想听建议。此刻你会怎么陪 TA？`,
    `${star.name}让你选歌，私人消息突然弹出。你的第一反应是什么？`,
    `${star.name}又忘了重要约定，还来向你道歉。你准备怎么处理？`,
    `${star.name}要长期搬去陌生城市，也想听听你的想法。你会怎样参与这个决定？`,
    `${star.name}联系变少，但重要时刻都在。你会用什么判断关系是否稳定？`,
    `${star.name}${affectionMoment[star.id] ?? "忽然向你靠近"}。当下你怎么回应？`,
    `${star.name}今晚只想和老朋友聚会。你会介意吗？`,
    `${star.name}临时想改掉准备很久的旅行计划。你愿意一起调整吗？`,
  ];
  return templates.map((question, index) => ({
    ...question,
    eyebrow: index === 0 ? `TA 只给你看的${thirdTrait}` : question.eyebrow?.replaceAll("Bang Chan", star.name),
    question: questions[index],
  }));
}

const legacyStarIds: Record<string, string> = {
  "lin-yue": "bang-chan",
  "chen-zhou": "hyunjin",
  "xu-ran": "james",
  "luo-jing": "juhoon",
  "su-wan": "keonho",
  "jiang-che": "seonghyeon",
};

export function getStar(id: string) {
  const resolvedId = legacyStarIds[id] ?? id;
  return stars.find((star) => star.id === resolvedId);
}
