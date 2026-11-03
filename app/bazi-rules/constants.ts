// ── 命理规则层基础常量(个人报告 V3 唯一数据源) ─────────────────────────────
// 设计原则:本目录是个人报告的确定性命理判断的唯一实现;双人合盘与明星报告
// 继续使用各自现有代码,不引用本目录。表数据口径在 tests/bazi-rules.test.mjs
// 中与 lunar-javascript 逐一比对,防漂移。
//
// 合化口径声明:天干五合与地支六合/三合,本系统一律「只论合、不默认化」——
// 化气成立需要月令司令与全局配合,属流派争议区,不做确定性判定;AI 文案亦
// 不得自行断化。

export type Element = "木" | "火" | "土" | "金" | "水";
export type TenGodCategory = "比劫" | "印星" | "食伤" | "财星" | "官杀";
export type TenGod = "比肩" | "劫财" | "食神" | "伤官" | "正财" | "偏财" | "正官" | "七杀" | "正印" | "偏印";

export const GAN_LIST = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const ZHI_LIST = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export const GAN_WUXING: Record<string, Element> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
export const ZHI_WUXING: Record<string, Element> = {
  子: "水", 丑: "土", 寅: "木", 卯: "木", 辰: "土", 巳: "火",
  午: "火", 未: "土", 申: "金", 酉: "金", 戌: "土", 亥: "水",
};

/** 干的阴阳(索引奇偶):甲丙戊庚壬为阳,乙丁己辛癸为阴 */
export const isYangGan = (gan: string) => GAN_LIST.indexOf(gan as (typeof GAN_LIST)[number]) % 2 === 0;

/** 五行相生:木→火→土→金→水→木 */
export const SHENG: Record<Element, Element> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
/** 五行相克:木→土→水→火→金→木 */
export const KE: Record<Element, Element> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

/**
 * 地支藏干(本/中/余三气,子平通行口径)与司令权重:
 * 本气 3 / 中气 2 / 余气 1。与 lunar-javascript 的 ZHI_HIDE_GAN 表一致性由单测保证。
 */
export const ZHI_HIDDEN: Record<string, Array<{ stem: string; grade: "本气" | "中气" | "余气"; weight: number }>> = {
  子: [{ stem: "癸", grade: "本气", weight: 3 }],
  丑: [{ stem: "己", grade: "本气", weight: 3 }, { stem: "癸", grade: "中气", weight: 2 }, { stem: "辛", grade: "余气", weight: 1 }],
  寅: [{ stem: "甲", grade: "本气", weight: 3 }, { stem: "丙", grade: "中气", weight: 2 }, { stem: "戊", grade: "余气", weight: 1 }],
  卯: [{ stem: "乙", grade: "本气", weight: 3 }],
  辰: [{ stem: "戊", grade: "本气", weight: 3 }, { stem: "乙", grade: "中气", weight: 2 }, { stem: "癸", grade: "余气", weight: 1 }],
  巳: [{ stem: "丙", grade: "本气", weight: 3 }, { stem: "戊", grade: "中气", weight: 2 }, { stem: "庚", grade: "余气", weight: 1 }],
  午: [{ stem: "丁", grade: "本气", weight: 3 }, { stem: "己", grade: "中气", weight: 2 }],
  未: [{ stem: "己", grade: "本气", weight: 3 }, { stem: "丁", grade: "中气", weight: 2 }, { stem: "乙", grade: "余气", weight: 1 }],
  申: [{ stem: "庚", grade: "本气", weight: 3 }, { stem: "壬", grade: "中气", weight: 2 }, { stem: "戊", grade: "余气", weight: 1 }],
  酉: [{ stem: "辛", grade: "本气", weight: 3 }],
  戌: [{ stem: "戊", grade: "本气", weight: 3 }, { stem: "辛", grade: "中气", weight: 2 }, { stem: "丁", grade: "余气", weight: 1 }],
  亥: [{ stem: "壬", grade: "本气", weight: 3 }, { stem: "甲", grade: "中气", weight: 2 }],
};

/** 地支六合(子丑合、寅亥合…) */
export const LIU_HE: Record<string, string> = {
  子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯",
  辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
};
/** 地支六冲 */
export const CHONG: Record<string, string> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
};
/** 地支六害 */
export const HAI: Record<string, string> = {
  子: "未", 未: "子", 丑: "午", 午: "丑", 寅: "巳", 巳: "寅",
  卯: "辰", 辰: "卯", 申: "亥", 亥: "申", 酉: "戌", 戌: "酉",
};
/** 地支六破 */
export const PO: Record<string, string> = {
  子: "酉", 酉: "子", 丑: "辰", 辰: "丑", 寅: "亥", 亥: "寅",
  卯: "午", 午: "卯", 巳: "申", 申: "巳", 未: "戌", 戌: "未",
};
/** 天干五合(甲己、乙庚、丙辛、丁壬、戊癸)——只论合,不默认化 */
export const GAN_HE: Record<string, string> = {
  甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙",
  丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊",
};

/** 三合局:申子辰合水、寅午戌合火、巳酉丑合金、亥卯未合木 */
export const SAN_HE_JU: Array<{ branches: [string, string, string]; element: Element }> = [
  { branches: ["申", "子", "辰"], element: "水" },
  { branches: ["寅", "午", "戌"], element: "火" },
  { branches: ["巳", "酉", "丑"], element: "金" },
  { branches: ["亥", "卯", "未"], element: "木" },
];
/** 三合局旺支(子午卯酉):半合须含旺支,否则为拱合(力弱) */
export const SAN_HE_WANG = new Set(["子", "午", "卯", "酉"]);

/**
 * 相刑配对(无序):无恩之刑 寅巳申互见、恃势之刑 丑戌未互见、无礼之刑 子卯互见、
 * 自刑 辰辰/午午/酉酉/亥亥。统一按无序对收录,消除旧实现的正反序口径差。
 */
export const XING_PAIRS = new Set([
  "寅巳", "寅申", "巳申", "丑戌", "丑未", "戌未", "子卯",
  "辰辰", "午午", "酉酉", "亥亥",
]);

/** 月支 → 四季(调候与旺衰的季节背景) */
export const SEASON_OF_MONTH: Record<string, "春" | "夏" | "秋" | "冬" | "四季土"> = {
  寅: "春", 卯: "春", 辰: "四季土",
  巳: "夏", 午: "夏", 未: "四季土",
  申: "秋", 酉: "秋", 戌: "四季土",
  亥: "冬", 子: "冬", 丑: "四季土",
};

/** 日干禄位(临官):甲禄在寅、乙禄在卯… */
export const LU_OF: Record<string, string> = {
  甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午",
  庚: "申", 辛: "酉", 壬: "亥", 癸: "子",
};
/** 日干刃位(帝旺,通行口径仅阳干有刃) */
export const REN_OF: Partial<Record<string, string>> = { 甲: "卯", 丙: "午", 戊: "午", 庚: "酉", 壬: "子" };

/** 完整十神判定:以日干为太极,按五行生克与阴阳同异定名 */
export function tenGodOf(dayMaster: string, other: string): TenGod {
  const d = GAN_WUXING[dayMaster];
  const o = GAN_WUXING[other];
  const samePolarity = isYangGan(dayMaster) === isYangGan(other);
  if (d === o) return samePolarity ? "比肩" : "劫财";
  if (SHENG[d] === o) return samePolarity ? "食神" : "伤官";
  if (KE[d] === o) return samePolarity ? "偏财" : "正财";
  if (KE[o] === d) return samePolarity ? "七杀" : "正官";
  return samePolarity ? "偏印" : "正印";
}

/** 十神 → 五大类 */
export function tenGodCategory(god: TenGod | string): TenGodCategory {
  if (god === "比肩" || god === "劫财") return "比劫";
  if (god === "食神" || god === "伤官") return "食伤";
  if (god === "正财" || god === "偏财") return "财星";
  if (god === "正官" || god === "七杀") return "官杀";
  return "印星";
}

/** 生我者(印)、我生者(食伤)、克我者(官杀)、我克者(财)、同我者(比劫)的五行 */
export function elementOfCategory(dayMaster: string): Record<TenGodCategory, Element> {
  const day = GAN_WUXING[dayMaster];
  const seal = (Object.keys(SHENG) as Element[]).find((el) => SHENG[el] === day) as Element;
  const officer = (Object.keys(KE) as Element[]).find((el) => KE[el] === day) as Element;
  return { 比劫: day, 印星: seal, 食伤: SHENG[day], 财星: KE[day], 官杀: officer };
}

/** 合化声明(注入 prompt 与文案口径):只论合,不默认化 */
export const HE_HUA_NOTE = "天干五合与地支六合/三合一律只论合、不默认化——化气成立需月令司令与全局配合,本系统不做确定性化气判定,文案亦不得自行断化。";
