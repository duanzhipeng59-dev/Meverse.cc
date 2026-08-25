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
};

export type TestOption = {
  label: string;
  value: number;
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
    "bang-chan": "又主动承担了很多团队责任，嘴上却说“我没事”",
    hyunjin: "因为作品没有达到理想效果而反复修改，情绪明显低落",
    james: "为了弄懂一个问题沉浸了很久，几乎忘记照顾自己",
    juhoon: "跟着当下感觉临时改变了原本的安排",
    keonho: "对一个新想法投入全部注意力，暂时顾不上周围的人",
    seonghyeon: "默默承担了很多任务，却不愿主动诉苦",
  };
  const affectionMoment: Record<string, string> = {
    "bang-chan": "后台安静下来后，在确认你愿意后轻轻亲了一下你的额头",
    hyunjin: "分别前忽然靠近，在确认你没有躲开后轻轻亲了一下你的额头",
    james: "聊天停下来的瞬间，在确认你愿意后轻轻亲了一下你的额头",
    juhoon: "人群散去后，忽然轻轻牵住了你的手",
    keonho: "并肩走路时，忽然轻轻牵住了你的手",
    seonghyeon: "送你回去的路上，忽然轻轻牵住了你的手",
  };

  const coreQuestions: TestQuestion[] = [
    {
      id: "idol-pressure",
      dimension: "security",
      eyebrow: `只有你看见的${thirdTrait}时刻`,
      question: `演出结束后，${star.name}${pressureScenario[star.id] ?? "把大量精力投入一件重要的事"}，却悄悄靠在你肩上。你会怎么做？`,
      options: [
        { label: "先问 TA 希望被怎样支持，再默默分担能做的部分", value: 4 },
        { label: "立刻替 TA 做决定，让 TA 必须休息", value: 2 },
        { label: "相信 TA 能处理，完全不过问", value: 1 },
        { label: "送上一句鼓励，等 TA 主动找我", value: 3 },
      ],
    },
    {
      id: "idol-silence",
      dimension: "expression",
      eyebrow: `${star.name}只向你露出的安静`,
      question: `散场后的车里，${star.name}忽然变得安静，只低声说“和你待着就好”。你会怎么回应？`,
      options: [
        { label: "不断追问，直到 TA 告诉我", value: 1 },
        { label: "说明我愿意听，同时给 TA 一点整理情绪的空间", value: 4 },
        { label: "装作没有发现，避免气氛尴尬", value: 2 },
        { label: "先陪在身边，过一会儿再轻轻确认", value: 3 },
      ],
    },
    {
      id: "idol-focus",
      dimension: "independence",
      eyebrow: `一句深夜的“想见你”`,
      question: `${star.name}为了重要作品忙了很久，深夜忽然发来“有点想见你”，但你明天也有重要安排。你会？`,
      options: [
        { label: "尊重 TA 的专注，也安排好自己的生活和节奏", value: 4 },
        { label: "支持，但希望 TA 每天固定向我报备", value: 3 },
        { label: "故意冷淡，让 TA 意识到忽略了我", value: 1 },
        { label: "暂时忍耐，等结束后再一次性表达不满", value: 2 },
      ],
    },
    {
      id: "idol-disagreement",
      dimension: "conflict",
      eyebrow: `心动也会遇到分歧`,
      question: `一次很期待的约会中，你和${star.name}对未来安排的看法完全相反，气氛忽然安静下来。你会？`,
      options: [
        { label: "先理解 TA 在意什么，再清楚表达自己的理由", value: 4 },
        { label: "为了不争吵，直接同意 TA", value: 2 },
        { label: "证明我的判断更正确", value: 1 },
        { label: "先暂停，约定情绪稳定后继续谈", value: 3 },
      ],
    },
    {
      id: "idol-surprise",
      dimension: "novelty",
      eyebrow: `${star.name}发来的秘密坐标`,
      question: `${star.name}突然发来一个地址，说“想带你去一个只有我知道的地方”，但会打乱你的计划。你会？`,
      options: [
        { label: "先了解安排，如果条件允许就陪 TA 一起尝试", value: 4 },
        { label: "马上答应，即使要取消所有原计划", value: 3 },
        { label: "拒绝，我不喜欢任何计划外变化", value: 1 },
        { label: "让 TA 自己去，我不想参与 TA 的圈子", value: 2 },
      ],
    },
    {
      id: "idol-care",
      dimension: "expression",
      eyebrow: `被${star.name}记住的小细节`,
      question: `${star.name}把你随口提过的小愿望记了很久，见面时若无其事地把礼物递给你。你会？`,
      options: [
        { label: "认真告诉 TA，我看见了礼物背后的心意", value: 4 },
        { label: "表现得很夸张，证明自己足够感动", value: 2 },
        { label: "自然收下，之后用行动回应 TA", value: 3 },
        { label: "更关心礼物值不值钱", value: 1 },
      ],
    },
    {
      id: "idol-boundary",
      dimension: "independence",
      eyebrow: `靠近之后，也允许独处`,
      question: `刚度过一个很亲密的下午，${star.name}却轻声说“今晚想自己待一会儿”。你的第一反应是？`,
      options: [
        { label: "尊重这个需要，并约定合适的时候再联系", value: 4 },
        { label: "答应，但会反复查看 TA 的动态", value: 2 },
        { label: "觉得 TA 一定是不喜欢我了", value: 1 },
        { label: "留下一句关心，然后去做自己的事情", value: 3 },
      ],
    },
    {
      id: "idol-publicity",
      dimension: "security",
      eyebrow: `人群里只有你看懂的信号`,
      question: `面对很多外界目光，${star.name}不能公开靠近，却在人群里只对你做了熟悉的小动作。你会？`,
      options: [
        { label: "一起商量边界，用私下的稳定替代公开证明", value: 4 },
        { label: "理解，但仍希望 TA 偶尔公开暗示", value: 3 },
        { label: "要求 TA 公开证明关系", value: 1 },
        { label: "把所有决定都交给 TA", value: 2 },
      ],
    },
    {
      id: "idol-mistake",
      dimension: "conflict",
      eyebrow: `${star.name}最怕被你失望的瞬间`,
      question: `${star.name}犯错后低声问“你是不是对我失望了”，眼神却一直停在你身上。你会怎么回应？`,
      options: [
        { label: "先接住情绪，再陪 TA 复盘可以改变的部分", value: 4 },
        { label: "马上说“没关系”，尽快结束这个话题", value: 2 },
        { label: "指出所有问题，避免下次再犯", value: 1 },
        { label: "给出安慰，等 TA 好一点再谈事情本身", value: 3 },
      ],
    },
    {
      id: "idol-future",
      dimension: "novelty",
      eyebrow: `一句关于“以后”的试探`,
      question: `夜聊时，${star.name}忽然问“如果几年以后，我们还在一起呢？”你会？`,
      options: [
        { label: "说出真实期待，也一起讨论现实中的节奏和责任", value: 4 },
        { label: "先享受当下，不回应任何未来话题", value: 1 },
        { label: "给出浪漫承诺，具体怎么做以后再说", value: 2 },
        { label: "表达愿意认真尝试，再通过行动慢慢兑现", value: 3 },
      ],
    },
  ];

  const deepQuestions: TestQuestion[] = [
    {
      id: "idol-unspoken",
      dimension: "expression",
      eyebrow: `热烈之后，忽然变短的消息`,
      question: `一次很心动的见面后，${star.name}连续几天回复都很简短，却说自己只是太累。你会如何判断什么时候该靠近？`,
      options: [
        { label: "立刻追问到底发生了什么", value: 1 },
        { label: "不再联系，等 TA 完全恢复", value: 2 },
        { label: "先表达关心，观察 TA 是否愿意继续说", value: 3 },
        { label: "说明我注意到了变化，并让 TA 自己选择陪伴方式", value: 4 },
      ],
    },
    {
      id: "idol-opportunity",
      dimension: "independence",
      eyebrow: `拥抱告别前的远方消息`,
      question: `拥抱告别前，${star.name}告诉你自己得到一个重要机会，但这意味着你们很长时间无法见面。你会怎么谈？`,
      options: [
        { label: "让 TA 在机会和关系之间选一个", value: 1 },
        { label: "嘴上支持，心里等待 TA 主动补偿", value: 2 },
        { label: "支持选择，同时提出我真实的不安", value: 3 },
        { label: "共同设计远距离节奏，并保留彼此独立成长的空间", value: 4 },
      ],
    },
    {
      id: "idol-repair",
      dimension: "conflict",
      eyebrow: "争执后的那句“我们谈谈吧”",
      question: `争执后，${star.name}发来“我不想失去你，但需要先想清楚”，而你希望马上解决。你会？`,
      options: [
        { label: "继续谈到当场解决为止", value: 1 },
        { label: "彻底冷处理，看谁先低头", value: 2 },
        { label: "先暂停，但要求 TA 当天给答复", value: 3 },
        { label: "约定重新沟通的时间，也分别整理真正的需求", value: 4 },
      ],
    },
    {
      id: "idol-visibility",
      dimension: "security",
      eyebrow: "镜头之外的一次握手",
      question: `外界开始猜测你们的关系，${star.name}承受了明显压力，却在无人注意时轻轻握住你的手。你会把什么放在第一位？`,
      options: [
        { label: "让所有人知道事实，停止猜测", value: 1 },
        { label: "完全听 TA 的，我不表达意见", value: 2 },
        { label: "先保护隐私，再讨论彼此需要的确定感", value: 4 },
        { label: "减少接触，等风波自己过去", value: 3 },
      ],
    },
    {
      id: "idol-rhythm",
      dimension: "novelty",
      eyebrow: `心跳慢下来以后`,
      question: `最初的热烈过去后，${star.name}更喜欢一起吃饭、散步和安静陪伴。你会如何回应这种变化？`,
      options: [
        { label: "认为没有惊喜就是不爱了", value: 1 },
        { label: "接受日常，但希望 TA 负责制造变化", value: 2 },
        { label: "一起保留仪式感，也允许关系自然安静", value: 4 },
        { label: "偶尔提出新体验，观察 TA 的反馈", value: 3 },
      ],
    },
    {
      id: "idol-values",
      dimension: "security",
      eyebrow: "聊到未来时的不同答案",
      question: `一次温柔的夜聊里，你和${star.name}都承认很在意彼此，却发现对未来生活方式有明显分歧。你会？`,
      options: [
        { label: "相信爱能解决一切，不必现在讨论", value: 2 },
        { label: "要求其中一方彻底改变", value: 1 },
        { label: "先找共同底线，再判断差异是否真的能共存", value: 4 },
        { label: "暂时各退一步，以后再决定", value: 3 },
      ],
    },
    {
      id: "idol-listening",
      dimension: "expression",
      eyebrow: `深夜只想说给你听的话`,
      question: `${star.name}深夜向你讲起一件很挫败的事，最后说“我现在只想让你听着”。你会怎么陪 TA？`,
      options: [
        { label: "还是给出方案，解决问题最重要", value: 1 },
        { label: "不知道说什么，于是转换话题", value: 2 },
        { label: "先听完，再确认 TA 是否需要我的想法", value: 4 },
        { label: "表达理解，等 TA 主动继续讲", value: 3 },
      ],
    },
    {
      id: "idol-privacy",
      dimension: "independence",
      eyebrow: "被信任，不等于可以越界",
      question: `${star.name}把手机交给你选歌，一条私人消息刚好弹出来。你最真实的反应是？`,
      options: [
        { label: "顺便看一下，亲密关系不该有秘密", value: 1 },
        { label: "立刻移开视线，也不把这件事当作试探", value: 4 },
        { label: "不看，但之后旁敲侧击询问内容", value: 2 },
        { label: "告诉 TA 我看到了界面，但没有继续阅读", value: 3 },
      ],
    },
    {
      id: "idol-pattern",
      dimension: "conflict",
      eyebrow: "心软之前，先看见重复的问题",
      question: `${star.name}再次忘记了对你的一个重要约定，见面时认真道歉并想抱抱你。你会怎么判断这段关系还能不能修复？`,
      options: [
        { label: "翻出以前所有问题，证明 TA 从没改变", value: 1 },
        { label: "继续忍耐，相信时间久了自然会好", value: 2 },
        { label: "先看这次是否有新的原因，再表达失望", value: 3 },
        { label: "讨论行为模式、改进期限和彼此不能退让的底线", value: 4 },
      ],
    },
    {
      id: "idol-relocation",
      dimension: "novelty",
      eyebrow: `“想和你一起去”的远方`,
      question: `${star.name}兴奋地告诉你，自己获得了一个需要长期搬去陌生城市的机会，并问“你愿意和我一起想办法吗？”你会？`,
      options: [
        { label: "要求 TA 为关系放弃机会", value: 1 },
        { label: "马上决定跟随，不考虑自己的生活", value: 2 },
        { label: "分别列出现实代价，再寻找阶段性方案", value: 4 },
        { label: "先支持 TA，再慢慢思考自己的选择", value: 3 },
      ],
    },
    {
      id: "idol-consistency",
      dimension: "security",
      eyebrow: "晚安还在，消息却变少了",
      question: `${star.name}最近依然会说晚安、记得重要日子，但联系频率不再像最初那么高。什么最能帮助你判断关系是否稳定？`,
      options: [
        { label: "每天消息数量是否保持不变", value: 1 },
        { label: "TA 是否愿意公开表达关系", value: 2 },
        { label: "重要时刻是否出现，并持续兑现约定", value: 4 },
        { label: "我不主动时，TA 会不会立刻发现", value: 3 },
      ],
    },
    {
      id: "idol-affection",
      dimension: "expression",
      eyebrow: "突然加速的心跳",
      question: `如果${affectionMoment[star.id] ?? `${star.name}忽然向你靠近`}，随后有些害羞地移开视线，你会？`,
      options: [
        { label: "因为太突然，用玩笑把这一刻岔开", value: 1 },
        { label: "假装镇定，等 TA 再主动一点", value: 2 },
        { label: "用一个靠近的动作回应，让 TA 知道我没有拒绝", value: 3 },
        { label: "先确认彼此都舒服，再坦白自己也很心动", value: 4 },
      ],
    },
    {
      id: "idol-social-boundary",
      dimension: "independence",
      eyebrow: `被偏爱，也不占有全部生活`,
      question: `${star.name}抱了抱你，又笑着说今晚想只和老朋友聚会。你会怎么回应？`,
      options: [
        { label: "要求一起参加，恋人不该被排除", value: 1 },
        { label: "答应，但整晚频繁询问情况", value: 2 },
        { label: "尊重安排，也自然过好自己的时间", value: 4 },
        { label: "表示理解，希望结束后分享有趣的事", value: 3 },
      ],
    },
    {
      id: "idol-change-plan",
      dimension: "novelty",
      eyebrow: `一张写着“和你一起”的新地图`,
      question: `${star.name}拿出一张新地图，想改变你们筹备很久的旅行计划，因为发现了更特别的目的地。你会？`,
      options: [
        { label: "直接拒绝，计划确定后就不能改变", value: 1 },
        { label: "完全听 TA 的，不表达自己的顾虑", value: 2 },
        { label: "一起比较期待和现实成本，再共同决定", value: 4 },
        { label: "如果改动不大，我愿意尝试新方案", value: 3 },
      ],
    },
  ];

  return [...coreQuestions, ...deepQuestions];
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
