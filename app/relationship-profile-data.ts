export type RelationshipDimension = "security" | "expression" | "conflict" | "boundaries" | "support" | "rhythm";

export type RelationshipQuestion = {
  id: string;
  dimension: RelationshipDimension;
  eyebrow: string;
  question: string;
  options: { label: string; value: number }[];
};

export const relationshipDimensions: Record<RelationshipDimension, {
  label: string;
  low: string;
  high: string;
  lowSummary: string;
  highSummary: string;
}> = {
  security: { label: "安全感回应", low: "自我安定", high: "连接确认", lowSummary: "不确定出现时，你更习惯先稳住自己、观察事实。", highSummary: "不确定出现时，你更希望通过明确回应恢复连接。" },
  expression: { label: "情绪表达", low: "含蓄表达", high: "直接表达", lowSummary: "你常通过语气、行动和细节传递真实感受。", highSummary: "你倾向把感受和期待说清楚，减少彼此猜测。" },
  conflict: { label: "冲突处理", low: "暂停消化", high: "即时沟通", lowSummary: "发生分歧时，你更需要空间整理感受再回应。", highSummary: "发生分歧时，你更愿意尽快把问题摆到桌面上。" },
  boundaries: { label: "亲密边界", low: "紧密陪伴", high: "独立空间", lowSummary: "你通过共享时间和持续陪伴感受关系的确定。", highSummary: "你重视亲密，也希望双方保留各自的生活空间。" },
  support: { label: "支持方式", low: "独自处理", high: "共同承担", lowSummary: "遇到压力时，你通常先靠自己整理和解决。", highSummary: "遇到压力时，你愿意让信任的人参与和支持。" },
  rhythm: { label: "关系节奏", low: "顺其自然", high: "稳定规划", lowSummary: "你喜欢让关系自然生长，为变化保留弹性。", highSummary: "你希望关系有清晰节奏，也愿意共同规划未来。" },
};

const q = (id: string, dimension: RelationshipDimension, eyebrow: string, question: string, labels: [string, string, string, string], values: [number, number, number, number]): RelationshipQuestion => ({
  id, dimension, eyebrow, question,
  options: labels.map((label, index) => ({ label, value: values[index] })),
});

export const relationshipQuestions: RelationshipQuestion[] = [
  q("s1", "security", "消息与距离", "对方很久没有回复消息，你通常会怎么做？", ["先忙自己的事，晚些再看", "发一条轻松的消息确认", "直接问对方是不是发生了什么", "反复回想自己是否说错了话"], [0, 1, 2, 3]),
  q("s2", "security", "关系确认", "你察觉对方最近有些冷淡，第一反应更接近哪一种？", ["先观察几天，不急着下结论", "找合适时机聊聊近况", "希望对方明确告诉我原因", "会不断确认对方是否还在意我"], [0, 1, 2, 3]),
  q("s3", "security", "独处时刻", "对方临时取消了周末约会，你更可能？", ["重新安排自己的周末", "表示理解，之后再约", "想知道下一次见面的确定时间", "会担心这是否代表关系变淡"], [0, 1, 2, 3]),
  q("s4", "security", "公开表达", "对方不太喜欢公开表达亲密，你会？", ["尊重方式不同，不影响我的判断", "偶尔表达自己希望被回应", "认真讨论彼此需要怎样的确认", "很难不把它理解成不够在意"], [0, 1, 2, 3]),
  q("e1", "expression", "表达心意", "你很想念对方时，通常会怎么表达？", ["默默关注或准备一个小惊喜", "找个自然的话题开始聊天", "用玩笑暗示自己想见面", "直接告诉对方我想你了"], [0, 1, 2, 3]),
  q("e2", "expression", "感到受伤", "对方无意中说了一句让你难过的话，你会？", ["先藏起来，看对方能否察觉", "用态度表达自己不太开心", "晚些用比较委婉的方式说明", "直接描述这句话带给我的感受"], [0, 1, 2, 3]),
  q("e3", "expression", "提出需要", "你希望对方多陪你一点，最可能怎么做？", ["主动制造更多相处机会", "暗示最近有点孤单", "询问对方近期是否有空", "清楚说出我需要更多陪伴"], [0, 1, 2, 3]),
  q("e4", "expression", "接受赞美", "当对方认真夸奖你时，你通常？", ["有点不好意思，转开话题", "用行动回馈对方", "笑着接受但不会多说", "坦然感谢，也表达我的欣赏"], [0, 1, 2, 3]),
  q("c1", "conflict", "意见不同", "你们因为一件小事争执起来，你更倾向？", ["先暂停，让情绪降下来", "各自消化后再找机会聊", "当下简短确认彼此的重点", "希望尽快把问题完整说清楚"], [0, 1, 2, 3]),
  q("c2", "conflict", "修复关系", "一次不愉快结束后，你通常会？", ["需要独处一段时间", "等气氛自然缓和", "发消息说明我愿意再聊", "主动约定时间完成这次沟通"], [0, 1, 2, 3]),
  q("c3", "conflict", "被误解时", "对方误解了你的本意，你第一步会？", ["先不解释，避免越说越乱", "整理好语言后再说明", "先问清对方为什么这样理解", "马上解释事实和自己的感受"], [0, 1, 2, 3]),
  q("c4", "conflict", "反复问题", "同一个矛盾再次出现，你会？", ["暂时避开，等状态更好", "改变自己的做法观察结果", "提醒对方我们曾经谈过", "重新讨论原因并约定具体办法"], [0, 1, 2, 3]),
  q("b1", "boundaries", "个人空间", "进入稳定关系后，你理想的联系频率是？", ["一天里保持比较持续的分享", "每天有固定的交流时间", "有事情或想念时自然联系", "各自生活，几天不联系也可以"], [0, 1, 2, 3]),
  q("b2", "boundaries", "周末安排", "对方想独自度过一个周末，你更接近？", ["希望至少安排一段共同时间", "有点失落，但可以接受", "支持对方，也安排自己的活动", "很享受双方都拥有独立周末"], [0, 1, 2, 3]),
  q("b3", "boundaries", "朋友圈子", "你怎么看待伴侣彼此独立的朋友圈？", ["希望大部分朋友和活动都能共享", "重要活动最好邀请彼此", "既有共同朋友，也保留各自圈子", "不必融入彼此的社交生活"], [0, 1, 2, 3]),
  q("b4", "boundaries", "私人信息", "伴侣是否应该知道彼此手机里的所有内容？", ["完全公开会让我更安心", "重要的事情不应有所隐瞒", "信任不等于查看全部隐私", "每个人都应该保有明确私人空间"], [0, 1, 2, 3]),
  q("p1", "support", "压力时刻", "工作或学习压力很大时，你通常？", ["自己消化，不太想让人担心", "先独自整理，再简单说说", "和信任的人分享发生了什么", "希望对方陪我一起面对和解决"], [0, 1, 2, 3]),
  q("p2", "support", "面对难题", "遇到一个难以决定的问题，你会？", ["独立分析后自己做决定", "先形成想法，再听听意见", "和对方一起比较不同选择", "希望通过共同讨论找到答案"], [0, 1, 2, 3]),
  q("p3", "support", "接受照顾", "身体不舒服时，你更希望？", ["自己照顾好自己就可以", "对方偶尔问候一下", "对方提供一些实际帮助", "对方能陪在身边一起处理"], [0, 1, 2, 3]),
  q("p4", "support", "对方低落", "对方情绪低落却说没事，你会？", ["尊重对方，让 TA 自己消化", "告诉 TA 需要时我在", "温和询问是否愿意聊聊", "主动陪伴并一起寻找解决办法"], [0, 1, 2, 3]),
  q("r1", "rhythm", "关系发展", "一段关系刚开始时，你更喜欢？", ["跟着感觉走，不提前定义", "享受当下，适时确认方向", "逐步谈清彼此期待", "尽早明确关系和未来计划"], [0, 1, 2, 3]),
  q("r2", "rhythm", "未来话题", "谈到一年后的生活，你通常？", ["觉得现在讨论还太早", "可以想象，但不必具体", "愿意交换各自的大致计划", "希望把共同目标安排得清楚"], [0, 1, 2, 3]),
  q("r3", "rhythm", "约会安排", "你理想的约会方式更接近？", ["临时起意最有趣", "只定大方向，现场决定", "提前确定时间和主要安排", "把时间、地点和流程都计划好"], [0, 1, 2, 3]),
  q("r4", "rhythm", "生活变化", "面对一项会影响关系的重大变化，你会？", ["先接受变化，边走边调整", "保留弹性，必要时再讨论", "提前沟通可能出现的问题", "共同制定明确的应对计划"], [0, 1, 2, 3]),
];

export type RelationshipScores = Record<RelationshipDimension, number>;

export function calculateRelationshipScores(answers: Record<string, number>): RelationshipScores {
  const dimensions = Object.keys(relationshipDimensions) as RelationshipDimension[];
  return Object.fromEntries(dimensions.map((dimension) => {
    const items = relationshipQuestions.filter((item) => item.dimension === dimension);
    const total = items.reduce((sum, item) => sum + (answers[item.id] ?? 0), 0);
    return [dimension, Math.round((total / (items.length * 3)) * 100)];
  })) as RelationshipScores;
}

export function relationshipArchetype(scores: RelationshipScores) {
  const ranked = (Object.keys(scores) as RelationshipDimension[])
    .map((dimension) => ({ dimension, distance: Math.abs(scores[dimension] - 50) }))
    .sort((a, b) => b.distance - a.distance);
  const primary = ranked[0].dimension;
  const isHigh = scores[primary] >= 50;
  const titles: Record<RelationshipDimension, [string, string]> = {
    security: ["从容信任型", "连接确认型"], expression: ["含蓄共感型", "坦率表达型"],
    conflict: ["冷静沉淀型", "主动修复型"], boundaries: ["亲密陪伴型", "自在独立型"],
    support: ["自主承担型", "协作支持型"], rhythm: ["自然生长型", "稳定共建型"],
  };
  return titles[primary][isHigh ? 1 : 0];
}
