// 明星正缘报告:基于八字盘的确定性解读(人生画像 + 感情),纯计算、无 AI 调用。
// 输入为 myfate-bazi-engine 的排盘结果;文案按五行/十神映射生成,60 位明星共用同一套规则。

import type { BaziChart, BaziDaYunStep } from "./myfate-bazi-engine";

type Element = "木" | "火" | "土" | "金" | "水";

const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const GAN_WUXING: Record<string, Element> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const ZHI_WUXING: Record<string, Element> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};
// 五行相生:A 生 SHENG[A]
const SHENG: Record<Element, Element> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
// 五行相克:A 克 KE[A]
const KE: Record<Element, Element> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

const LIU_HE: Record<string, string> = { 子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯", 辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午" };
const CHONG: Record<string, string> = { 子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅", 卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳" };
const GAN_HE: Record<string, string> = { 甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊" };
// 三合局首支 → 组内分支
const SAN_HE: Record<string, string[]> = { 申: ["申", "子", "辰"], 子: ["申", "子", "辰"], 辰: ["申", "子", "辰"], 寅: ["寅", "午", "戌"], 午: ["寅", "午", "戌"], 戌: ["寅", "午", "戌"], 巳: ["巳", "酉", "丑"], 酉: ["巳", "酉", "丑"], 丑: ["巳", "酉", "丑"], 亥: ["亥", "卯", "未"], 卯: ["亥", "卯", "未"], 未: ["亥", "卯", "未"] };
// 驿马:组 → 驿马支
const YI_MA: Record<string, string> = { 寅: "申", 午: "申", 戌: "申", 申: "寅", 子: "寅", 辰: "寅", 巳: "亥", 酉: "亥", 丑: "亥", 亥: "巳", 卯: "巳", 未: "巳" };
// 桃花:组 → 桃花支
const TAO_HUA: Record<string, string> = { 寅: "卯", 午: "卯", 戌: "卯", 申: "酉", 子: "酉", 辰: "酉", 巳: "午", 酉: "午", 丑: "午", 亥: "子", 卯: "子", 未: "子" };
// 阳刃:阳干 → 刃支
const YANG_REN: Record<string, string> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };

function tenGod(day: string, other: string): string {
  const d = GAN_WUXING[day];
  const o = GAN_WUXING[other];
  const samePolarity = GAN.indexOf(day) % 2 === GAN.indexOf(other) % 2;
  if (d === o) return samePolarity ? "比肩" : "劫财";
  if (SHENG[d] === o) return samePolarity ? "食神" : "伤官";
  if (KE[d] === o) return samePolarity ? "偏财" : "正财";
  if (KE[o] === d) return samePolarity ? "七杀" : "正官";
  return samePolarity ? "偏印" : "正印";
}

function godCategory(god: string): string {
  if (god === "比肩" || god === "劫财") return "比劫";
  if (god === "食神" || god === "伤官") return "食伤";
  if (god === "正财" || god === "偏财") return "财星";
  if (god === "正官" || god === "七杀") return "官杀";
  return "印星";
}

function roleOfElement(el: Element, dayMaster: string): string {
  const d = GAN_WUXING[dayMaster];
  if (el === d) return "比劫";
  if (SHENG[d] === el) return "食伤";
  if (KE[d] === el) return "财星";
  if (KE[el] === d) return "官杀";
  return "印星";
}

function yearGanZhi(year: number): string {
  const idx = ((year - 1984) % 60 + 60) % 60;
  return GAN[idx % 10] + ZHI[idx % 12];
}

// ————— 文案映射 —————

const ELEMENT_DESC: Record<Element, string> = {
  木: "生长与仁厚", 火: "热情与表达", 土: "包容与踏实", 金: "决断与精致", 水: "智慧与流动",
};
const ELEMENT_TRAIT: Record<Element, string> = {
  木: "身形清挺、五官舒展，带着干净的书卷气",
  火: "面色红润、眼神明亮、五官立体，笑起来很有感染力",
  土: "面容温厚耐看，举止踏实，给人安稳可信的感觉",
  金: "轮廓分明、肤质偏白，气质利落干练",
  水: "眼神灵动、气质聪慧，亲和力强，越看越有味道",
};
const ELEMENT_INDUSTRY: Record<Element, string> = {
  木: "教育培训、文创出版、医疗健康、生活方式",
  火: "演艺传播、新媒体、时尚美妆、餐饮",
  土: "房地产、建筑规划、食品农业、体制内或大型机构",
  金: "金融投资、科技互联网、法务财务、精密行业",
  水: "贸易物流、旅游航空、传媒策划、咨询与心理",
};
const ROLE_BENEFIT: Record<string, string> = {
  财星: "滋养现实生活，带来财富与人缘",
  食伤: "疏导能量，成全表达与才华",
  比劫: "帮身分忧，增强底气",
  印星: "生扶日主，带来庇护与滋养",
  官杀: "塑形立规，带来担当与成就",
};
const GOD_SHORT: Record<string, string> = {
  比劫: "自我与同伴", 印星: "学习与庇护", 食伤: "表达与创造", 财星: "务实与掌控", 官杀: "规则与担当",
};
const DAOFA_NOTE: Record<string, string> = {
  比劫: "先站稳自己，再把能量分给值得的人和事",
  印星: "先吸收安全感，再向外生长",
  食伤: "把旺盛的生命力转化为作品与表达",
  财星: "把才华落成现实的成果",
  官杀: "在规则与目标中成就自己",
};
const PERSONALITY: Record<string, string> = {
  比劫: "主见强、讲义气，认定的路不轻易回头，朋友在他生命里占比很重",
  印星: "好学深思、恋旧重情，看似随和，其实心里有一套稳定的秩序",
  食伤: "表达欲与创造力旺盛，审美在线，最受不了被管束和重复",
  财星: "务实、目标感强，对时间和金钱有规划，对认定的人出手大方",
  官杀: "自律、责任感重，习惯把压力扛在自己身上，越有挑战越成长",
};
const STRENGTH_NOTE: Record<string, string> = {
  身强: "能量充沛、敢想敢做，但容易固执己见——听得进劝，是他最省力的成长方式。",
  身弱: "感知细腻、以柔克刚，压力下容易自我怀疑，需要一个稳定的支持系统。",
  中和: "收放有度、适应力强，属于难得的平衡型命格。",
};
const STRENGTH_IMPL: Record<string, string> = {
  身强: "能担财官，抗压耐磨",
  身弱: "宜蓄势借力，不宜硬碰",
  中和: "格局平衡，进退有据",
};
const HIDE_GOD_TRAIT: Record<string, string> = {
  食神: "温和恋家、懂生活情趣",
  伤官: "聪明外放、有点小傲娇",
  正财: "务实细心，把日子过得井井有条",
  偏财: "爽朗大方、社交能力强",
  正官: "端正自律、讲原则",
  七杀: "果敢利落、有主见",
  正印: "温柔包容、有同理心",
  偏印: "心思细腻、带点艺术家脾气",
  比肩: "独立自我，是挚友式的相处模式",
  劫财: "行动派、直来直去",
};

// ————— 报告结构 —————

export type StarBaziShenSha = { label: string; text: string };

export type StarBaziReport = {
  pillars: BaziChart["pillars"];
  dayMaster: string;
  wuXing: Record<string, number>;
  trueSolar: BaziChart["trueSolar"];
  daYun: BaziChart["daYun"];
  meta: { monthZhi: string; spouseEl: Element; topGod: string; strength: string };
  portrait: {
    strength: string;
    lead: string;
    daoFa: string;
    xi: string;
    ji: string;
    xian: string;
    shenShaTitle: string;
    shenSha: StarBaziShenSha[];
    personality: string;
  };
  love: {
    spouseTraits: { label: string; text: string }[];
    family: string;
    stability: string;
    marriageLuck: { ganzhi: string; ageText: string; text: string; tag: string }[];
    romanceYears: { year: number; ganzhi: string; probability: number; text: string; warn: boolean }[];
  };
};

export function buildStarBaziReport(chart: BaziChart, currentYear = new Date().getFullYear()): StarBaziReport {
  const dayMaster = chart.dayMaster;
  const dayEl = GAN_WUXING[dayMaster];
  const sealEl = (Object.keys(SHENG) as Element[]).find((el) => SHENG[el] === dayEl) as Element;
  const officerEl = (Object.keys(KE) as Element[]).find((el) => KE[el] === dayEl) as Element;
  const wealthEl = KE[dayEl];
  const monthZhi = chart.pillars[1].ganzhi[1];
  const monthEl = ZHI_WUXING[monthZhi];
  const dayZhi = chart.pillars[2].ganzhi[1];
  const allZhi = chart.pillars.map((p) => p.ganzhi[1]);

  // ——— 身强身弱:同党(比劫+印)数量 + 月令加成 ———
  const support = chart.wuXing[dayEl] + chart.wuXing[sealEl] + (monthEl === dayEl || monthEl === sealEl ? 1 : 0);
  const strength = support >= 5 ? "身强" : support <= 2 ? "身弱" : "中和";

  // ——— 喜忌 ———
  const sortedEls = (Object.keys(chart.wuXing) as Element[]).sort((a, b) => chart.wuXing[a] - chart.wuXing[b]);
  let xiEls: Element[];
  let jiEls: Element[];
  let xianEls: Element[];
  if (strength === "身强") {
    xiEls = [wealthEl, SHENG[dayEl]];
    jiEls = [dayEl, sealEl];
    xianEls = [officerEl];
  } else if (strength === "身弱") {
    xiEls = [sealEl, dayEl];
    jiEls = [officerEl, wealthEl];
    xianEls = [SHENG[dayEl]];
  } else {
    xiEls = [sortedEls[0], sortedEls[1]];
    jiEls = [sortedEls[4]];
    xianEls = [sortedEls[2], sortedEls[3]];
  }
  const elRole = (el: Element) => roleOfElement(el, dayMaster);
  const xiText = xiEls.map((el) => `${el}（${elRole(el)}）`).join("、");
  const jiText = jiEls.map((el) => `${el}（${elRole(el)}）`).join("、");
  const xianText = xianEls.map((el) => `${el}（${elRole(el)}）`).join("、");

  // ——— 主气(道法):四干 + 藏干十神计数 ———
  const godCount: Record<string, number> = { 比劫: 0, 印星: 0, 食伤: 0, 财星: 0, 官杀: 0 };
  for (const p of chart.pillars) {
    if (p.label !== "日柱") godCount[godCategory(tenGod(dayMaster, p.ganzhi[0]))] += 1;
    for (const hg of p.hideGan) godCount[godCategory(tenGod(dayMaster, hg))] += 0.5;
  }
  const ranked = Object.entries(godCount).sort((a, b) => b[1] - a[1]);
  const [topGod, secondGod] = [ranked[0][0], ranked[1][0]];

  // ——— 神煞 ———
  const yiMaZhi = YI_MA[dayZhi];
  const taoHuaZhi = TAO_HUA[dayZhi];
  const yangRenZhi = YANG_REN[dayMaster] ?? "";
  const hasYiMa = allZhi.filter((z) => z === yiMaZhi).length > 0;
  const taoHuaHits = allZhi.filter((z) => z === taoHuaZhi).length;
  const hasYangRen = yangRenZhi !== "" && allZhi.includes(yangRenZhi);

  const maxEl = (Object.keys(chart.wuXing) as Element[]).sort((a, b) => chart.wuXing[b] - chart.wuXing[a])[0];
  const maxCount = chart.wuXing[maxEl];
  const maxPhrase = maxCount >= 4 ? `${maxEl}势极旺` : maxCount >= 3 ? `${maxEl}气偏旺` : "五行较为均衡";

  // ——— 人生画像 ———
  const lead = `${strength}。他的命局${maxPhrase}，日主${dayMaster}、生于${monthZhi}月，整体判断为${strength}，${STRENGTH_IMPL[strength]}。喜${xiText}；忌${jiText}；闲${xianText}。`;
  const daoFa = `道法与喜忌 他的道法是「${topGod}配${secondGod}」——命局能量以${GOD_SHORT[topGod]}为主、以${GOD_SHORT[secondGod]}为辅，${DAOFA_NOTE[topGod]}。`;
  const xi = `喜神：${xiEls.map((el) => `${el}——${ELEMENT_DESC[el]}，在此局中${ROLE_BENEFIT[elRole(el)]}。`).join("")}`;
  const ji = `忌神：${jiEls.map((el) => `${el}——过多则${elRole(el) === "比劫" ? "自我固化、易与人争夺" : elRole(el) === "印星" ? "思虑过重、行动变慢" : elRole(el) === "财星" ? "操劳于现实琐事" : "压力内耗、进退失据"}。`).join("")}`;
  const xian = `闲神：${xianEls.map((el) => `${el}（${elRole(el)}）`).join("、")}——不起决定作用，随大运流年起伏。`;
  const personality = `性格与行为模式 命局${strength}、${topGod}主导：${PERSONALITY[topGod]}${secondGod === "印星" ? "；同时又心思很重，需要独处充电" : ""}。${STRENGTH_NOTE[strength]}`;
  const shenSha: StarBaziShenSha[] = [
    { label: "驿马", text: hasYiMa ? `驿马：见（${yiMaZhi}）。命带驿马，一生多异地发展、跨界合作的机会，外出反而容易遇贵人。` : "驿马：无。人生重心偏稳，变动与迁移的信号不显著。" },
    { label: "阳刃", text: hasYangRen ? `阳刃：见（${yangRenZhi}）。个性里藏着一股狠劲，舞台上的爆发力多来源于此，但盛怒之下容易伤人伤己。` : "阳刃：无。性情中正，锋芒内敛，极端状态下也保有分寸。" },
    { label: "桃花", text: taoHuaHits > 0 ? `桃花：见（${taoHuaZhi}${taoHuaHits > 1 ? "，且不止一处" : ""}）。天生观众缘与异性缘俱佳，魅力是双刃剑，需守住边界。` : "桃花：无。异性缘走的是细水长流路线，不靠一时热度。" },
  ];

  // ——— 感情:配偶星(男命看财)、夫妻宫(日支) ———
  const spouseEl = chart.gender === "female" ? officerEl : wealthEl;
  const spouseGod = chart.gender === "female" ? "官杀（配偶星）" : "财星（配偶星）";
  const spouseCount = chart.wuXing[spouseEl];
  const dayPillar = chart.pillars[2];
  const hideTraits = dayPillar.hideShiShen.slice(0, 2).map((g) => HIDE_GOD_TRAIT[g] ?? "").filter(Boolean);

  const spouseTraits = [
    { label: "长相/气质", text: `他的另一半（${spouseEl}五行之人）通常${ELEMENT_TRAIT[spouseEl]}。` },
    { label: "性格", text: `夫妻宫坐${dayZhi}，藏干${dayPillar.hideGan.join("、")}——对方${hideTraits.join("，同时")}。` },
    { label: "个人能力", text: spouseCount >= 3 ? `命中${spouseGod}${spouseCount}见、根气十足，对方多半事业心强、经济独立，能在现实层面与他并肩。` : spouseCount === 2 ? `命中${spouseGod}${spouseCount}见，对方有自己的专长与节奏，属于细水长流型伙伴。` : spouseCount === 1 ? `命中${spouseGod}${spouseCount}见、偏弱，这段关系里他更像照顾者，对方的闪光点需要在日常里慢慢被发现。` : `命中${spouseGod}不透（深藏地支），缘分偏晚但后劲足，对方的闪光点需要在日常里慢慢被发现。` },
    { label: "能否旺他", text: xiEls.includes(spouseEl) ? "配偶星为喜用，另一半会带旺他的财运与状态，属于彼此成就的类型。" : jiEls.includes(spouseEl) ? "配偶星为忌，感情容易消耗他的精力，择偶时“省心”比“心动”更重要。" : "配偶星为闲神，感情对他的运势影响中性，关键看两个人怎么经营。" },
    { label: "另一半职业方向", text: `多为${ELEMENT_INDUSTRY[spouseEl]}等${spouseEl}属性行业。` },
  ];

  const otherZhi = [chart.pillars[0].ganzhi[1], chart.pillars[1].ganzhi[1], chart.pillars[3].ganzhi[1]];
  const heDayZhi = otherZhi.some((z) => LIU_HE[z] === dayZhi);
  const chongDayZhi = otherZhi.some((z) => CHONG[z] === dayZhi);
  const family = heDayZhi
    ? "对方家庭 对方家庭氛围融洽、父母开明，婚后能得到两边家庭的托举。"
    : chongDayZhi
      ? "对方家庭 对方家庭可能经历过变动或聚少离多，两个家庭的磨合需要多花一些耐心。"
      : "对方家庭 对方家庭平实安稳，不会成为感情里的主要课题，日子越过越顺。";
  const stability = topGod === "比劫"
    ? "婚姻稳定性 命局比劫偏旺，感情里容易出现竞争者或聚少离多的阶段——对他而言，“信任”永远比“控制”更有效。"
    : topGod === "食伤"
      ? "婚姻稳定性 食伤泄秀，他对另一半有浪漫的想象力，也需要大量个人空间；婚姻保鲜的秘诀是一起创造点什么。"
      : "婚姻稳定性 整体婚恋盘面平稳，没有明显的刑冲信号，属于细水长流的类型；真正要防的不是风浪，而是平淡期的心猿意马。";

  // ——— 一生婚恋大运 ———
  const dayunFlatTexts = [
    "这一步感情平稳，重心更多在事业与自我建设。",
    "此运感情戏份不多，缘分在别处悄悄生长，不急。",
    "大运未直接引动感情宫位，关系按自己的节奏走，稳定大于惊喜。",
  ];
  const dayunChongTexts = [
    "大运冲动夫妻宫，感情易有波折、异地或聚少离多的考验，重大决定宜缓。",
    "此运冲感情宫位，关系的弹性被反复测试——能一起扛过去的，大概率是正缘。",
  ];
  const marriageLuck = chart.daYun.steps
    .filter((step: BaziDaYunStep) => step.startAge >= 14 && step.startAge <= 60)
    .map((step: BaziDaYunStep) => {
      const stemEl = GAN_WUXING[step.ganzhi[0]];
      const branchEl = ZHI_WUXING[step.ganzhi[1]];
      const hasSpouse = stemEl === spouseEl || branchEl === spouseEl;
      const hasPeach = step.ganzhi[1] === taoHuaZhi;
      const heGong = LIU_HE[step.ganzhi[1]] === dayZhi;
      const chongGong = CHONG[step.ganzhi[1]] === dayZhi;
      const seed = step.startYear + step.startAge;
      let tag = "平稳期";
      let text = dayunFlatTexts[seed % dayunFlatTexts.length];
      if (hasSpouse && hasPeach) {
        tag = "婚恋窗口";
        text = "配偶星与桃花齐动，是全局里最容易定下来的婚恋大窗口。";
      } else if (hasSpouse) {
        tag = "婚恋窗口";
        text = "配偶星入运，恋爱与婚姻的机会明显增多，遇到的人条件也在线。";
      } else if (hasPeach) {
        tag = "婚恋窗口";
        text = "桃花入运，人缘与魅力上扬，感情故事丰富，但要防烂桃花。";
      } else if (heGong) {
        tag = "婚恋窗口";
        text = "大运与夫妻宫相合，关系容易在这一步走向稳定。";
      } else if (chongGong) {
        tag = "动荡期";
        text = dayunChongTexts[seed % dayunChongTexts.length];
      }
      return { ganzhi: step.ganzhi, ageText: `${step.startAge}-${step.endAge}岁`, text, tag };
    });

  // ——— 近期感情流年(未来10年):天干十神定主题,信号叠加定文案 ———
  const warnTexts: ((branchEl: string, branchRole: string) => string)[] = [
    (el, role) => `流年冲夫妻宫，${el}气（${role}）直撞感情位：聚少离多、旧事重提或外来干扰都可能出现，重大承诺宜缓。`,
    (el) => `冲动夫妻宫，${el}气撞入，关系里的变量被放大，容易因距离或旁人意见起波折；这一年先稳住自己，再做决定。`,
    () => "冲夫妻宫之年，感情如走窄桥，宜守不宜攻——把想说的说清楚，但别急着要答案。",
    () => "流年冲入感情宫位，波动难免：可能忽冷忽热、也可能心浮气躁，给彼此多一点缓冲期。",
  ];
  const comboTexts = [
    "配偶星与桃花叠动，是未来十年里缘分浓度最高的年份，遇到的人又心动又靠谱。",
    "配偶星与桃花齐发，感情大年：脱单、公开、定终身都占天时。",
  ];
  const spouseTexts = [
    "配偶星流年，容易遇到条件契合、能落到实处的人，桃花质量偏高。",
    "配偶星当值，异性缘与现实条件都在线，是适合认真表态的一年。",
    "配偶星引动，感情容易「来真的」——确认关系、见家长这类落地动作都合适。",
    "配偶星照命，感情从心动走向落地的一年，务实的选择会带来安全感。",
    "配偶星通关，社交与现实两条线都有机会，遇到的人经得起日常检验。",
  ];
  const peachTexts = [
    "桃花流年，魅力值拉满，社交场上容易被看见，人缘先于爱情到来。",
    "桃花入命，这一年不缺心动，缺的是筛选——新鲜感面前保持清醒。",
    "桃花当值，观众缘异性缘齐涨，舞台和聚会都是缘分入口。",
  ];
  const heGongTexts = [
    "流年合入夫妻宫，关系升温、名分落地都顺，适合确定关系。",
    "与夫妻宫相合，感情稳定度上扬，谈婚论嫁的事这一年好推进。",
    "合入感情宫位，遇到的人自带「定下来」的气质，值得认真对待。",
  ];
  const ganHeTexts = [
    "流年与日主相合，自己先动心的一年，心动归心动，节奏别乱。",
    "天干合日主，情绪容易被牵动、容易上头；确认过细节再投入。",
  ];
  const roleTheme: Record<string, string[]> = {
    比劫: [
      "比劫流年，朋友与热闹变多，感情多从熟人圈萌芽，但要防「被截胡」。",
      "比劫当值，自我意识强，容易因小事较劲；感情上退半步反而更顺。",
      "比劫之年，聚会多、开销也大，选人比花钱更重要。",
    ],
    印星: [
      "印星流年，心境偏静，适合沉淀与修复，旧人旧事有回头的迹象。",
      "印星主滋养，贵人多为长辈型，介绍与相亲的质量好过自由邂逅。",
      "印星当值，先把自己照顾好，缘分会在状态最好的时候靠近。",
    ],
    食伤: [
      "食伤流年，表达欲和魅力一起上扬，多露面、多表达，缘分来得比想象中快。",
      "食伤泄秀，状态轻盈有趣，容易因为作品或爱好被人注意到。",
      "食伤主创意与社交，这一年桃花带着欣赏而来，不妨主动一点。",
    ],
    官杀: [
      "官杀流年，事业与规矩占用精力，感情节奏偏慢，但来得多半是「正经人」。",
      "官杀当值，遇到的人偏成熟稳重，进展不快，却更接近能定下来的类型。",
      "官杀主责任与名分，适合把暧昧摊开谈，拖着反而彼此消耗。",
    ],
  };
  const roleStemScore: Record<string, number> = { 财星: 10, 食伤: 7, 官杀: 5, 印星: 2, 比劫: -3 };
  const roleBranchScore: Record<string, number> = { 财星: 8, 食伤: 4, 官杀: 3, 印星: 1, 比劫: -2 };

  // 同一明星内,同类信号的年份从文案池不同位置轮转,避免撞句
  const themeCursor: Record<string, number> = {};
  const cursor = (key: string) => {
    themeCursor[key] = (themeCursor[key] ?? 0) + 1;
    return themeCursor[key] - 1;
  };

  const romanceYears = [];
  for (let year = currentYear; year < currentYear + 10; year += 1) {
    const gz = yearGanZhi(year);
    const stemEl = GAN_WUXING[gz[0]];
    const branchEl = ZHI_WUXING[gz[1]];
    const stemRole = roleOfElement(stemEl, dayMaster);
    const branchRole = roleOfElement(branchEl, dayMaster);
    const hasSpouse = stemEl === spouseEl || branchEl === spouseEl;
    const hasPeach = gz[1] === taoHuaZhi;
    const heGong = LIU_HE[gz[1]] === dayZhi;
    const chongGong = CHONG[gz[1]] === dayZhi;
    const heDayMaster = GAN_HE[gz[0]] === dayMaster;
    const banHe = SAN_HE[dayZhi].includes(gz[1]) && gz[1] !== dayZhi;

    let score = 30 + roleStemScore[stemRole] + roleBranchScore[branchRole];
    if (hasPeach) score += 12;
    if (heGong) score += 12;
    if (banHe) score += 6;
    if (heDayMaster) score += 8;
    if (chongGong) score -= 22;
    const probability = Math.max(15, Math.min(85, Math.round(score)));

    const pick = (key: string, list: string[]) => list[cursor(key) % list.length];
    let text: string;
    let warn = false;
    if (chongGong) {
      text = warnTexts[cursor("warn") % warnTexts.length](branchEl, branchRole);
      warn = true;
    } else if (hasSpouse && hasPeach) {
      text = pick("combo", comboTexts);
    } else if (hasSpouse) {
      text = pick("spouse", spouseTexts);
    } else if (hasPeach) {
      text = pick("peach", peachTexts);
    } else if (heGong) {
      text = pick("hegong", heGongTexts);
    } else if (heDayMaster) {
      text = pick("ganhe", ganHeTexts);
    } else {
      text = pick(stemRole, roleTheme[stemRole] ?? ["流年平稳，感情随缘，宜把重心放在自己身上。"]);
    }
    romanceYears.push({ year, ganzhi: gz, probability, text, warn });
  }

  return {
    pillars: chart.pillars,
    dayMaster,
    wuXing: chart.wuXing,
    trueSolar: chart.trueSolar,
    daYun: chart.daYun,
    meta: { monthZhi, spouseEl, topGod, strength },
    portrait: { strength, lead, daoFa, xi, ji, xian, shenShaTitle: "神煞", shenSha, personality },
    love: { spouseTraits, family, stability, marriageLuck, romanceYears },
  };
}

const ELEMENT_TRAIT_SHORT: Record<Element, string> = {
  木: "清秀书卷", 火: "热情明亮", 土: "稳重踏实", 金: "利落干练", 水: "灵动聪慧",
};
const PACE_NOTE: Record<string, string> = {
  身强: "势均力敌", 身弱: "彼此托举", 中和: "细水长流",
};

const PERSONALITY_SHORT: Record<string, string> = {
  比劫: "主见强、讲义气，认定的路不轻易回头",
  印星: "好学深思、外圆内方，心里自有一套秩序",
  食伤: "表达欲与才华外放，最受不了被束缚",
  财星: "务实笃定、目标感强，对认定的人很大方",
  官杀: "自律有担当，压力之下反而越战越勇",
};

// 报告纯文本摘要:与报告页板块一一对应,供追问接口作为权威上下文。
export function formatStarBaziReport(report: StarBaziReport): string {
  const lines: string[] = [];
  lines.push(`四柱:${report.pillars.map((p) => p.ganzhi).join(" ")};日主:${report.dayMaster};五行:${Object.entries(report.wuXing).map(([k, v]) => `${k}${v}`).join(" ")}`);
  lines.push(`起运:${report.daYun.startText};当前大运:${report.daYun.steps.find((s) => s.current)?.ganzhi ?? ""}`);
  lines.push(`【人生画像】${report.portrait.lead}`);
  lines.push(report.portrait.daoFa);
  lines.push(report.portrait.xi);
  lines.push(report.portrait.ji);
  lines.push(report.portrait.xian);
  for (const item of report.portrait.shenSha) lines.push(item.text);
  lines.push(report.portrait.personality);
  lines.push("【感情】");
  for (const trait of report.love.spouseTraits) lines.push(`${trait.label}:${trait.text}`);
  lines.push(report.love.family);
  lines.push(report.love.stability);
  lines.push("一生婚恋大运:");
  for (const luck of report.love.marriageLuck) lines.push(`${luck.ganzhi}(${luck.ageText},${luck.tag}):${luck.text}`);
  lines.push("近期感情流年:");
  for (const year of report.love.romanceYears) lines.push(`${year.year}年(${year.ganzhi}) 缘分概率${year.probability}%${year.warn ? ",冲夫妻宫" : ""}:${year.text}`);
  return lines.join("\n");
}

// 详情页标题下的一句命理印象。
export function buildStarBaziHeadline(chart: BaziChart): string {
  const report = buildStarBaziReport(chart);
  const { monthZhi, topGod, strength } = report.meta;
  return `${report.dayMaster}${GAN_WUXING[report.dayMaster]}日主生于${monthZhi}月，命局${strength}、${topGod}主导`;
}

// 详情页按钮上方的 ~150 字正缘分析梗概。
export function buildStarBaziBrief(chart: BaziChart): string {
  const report = buildStarBaziReport(chart);
  const { monthZhi, spouseEl, topGod, strength } = report.meta;
  const dayZhi = chart.pillars[2].ganzhi[1];
  const hideTrait = (HIDE_GOD_TRAIT[chart.pillars[2].hideShiShen[0]] ?? "").split("，")[0];
  const best = [...report.love.romanceYears].sort((a, b) => b.probability - a.probability)[0];
  const warnYear = report.love.romanceYears.find((y) => y.warn);
  const window = report.love.marriageLuck.find((m) => m.tag === "婚恋窗口");
  return [
    `${report.dayMaster}${GAN_WUXING[report.dayMaster]}日主生于${monthZhi}月，命局${strength}、${topGod}主导：${PERSONALITY_SHORT[topGod]}。`,
    `感情上配偶星属${spouseEl}、夫妻宫坐${dayZhi}，正缘多为${ELEMENT_TRAIT_SHORT[spouseEl]}${hideTrait ? `、${hideTrait}` : ""}之人，相处宜${PACE_NOTE[strength]}。`,
    `未来十年缘分峰值在${best.year}年（${best.ganzhi}，${best.probability}%）${window ? `，${window.ganzhi}大运（${window.ageText}）是婚恋大窗口` : ""}。`,
    warnYear ? `${warnYear.year}年冲夫妻宫，聚散变数偏大，重大感情决定宜缓。` : "婚恋盘面整体平稳，没有明显的刑冲信号。",
  ].join("");
}
