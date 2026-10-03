// Western natal chart client and deterministic Chinese report builder.
// Engine: https://github.com/aryaminus/astro (MIT), selected from GitHub astrology agent skills.

type Tone = "strength" | "growth" | "neutral";

type EnginePlanet = {
  sign: string;
  deg_in_sign: number;
  abs_lon: number;
  house?: number;
  retrograde?: boolean;
  archetype?: string;
  dignity?: string;
};

type EngineAspect = {
  a: string;
  b: string;
  aspect: string;
  orb: number;
  meaning?: string;
};

type EngineWesternChart = {
  system: string;
  big_three: { sun: string; moon: string; rising?: string };
  ascendant?: { sign: string; deg_in_sign: number };
  midheaven?: { sign: string; deg_in_sign: number };
  descendant?: { sign: string; deg_in_sign: number };
  chart_ruler?: string;
  planets: Record<string, EnginePlanet>;
  houses?: Record<string, { sign: string; ruler: string; meaning?: string }>;
  aspects: EngineAspect[];
  element_balance: Record<string, number>;
  modality_balance: Record<string, number>;
  dominant_element?: string;
  lacking_element?: string;
};

type EngineResponse = {
  _meta?: { engine_backend?: string; house_system?: string; precision_note?: string };
  time_info?: { time_known?: boolean; tz_used?: string };
  charts?: { western?: EngineWesternChart };
  aspect_patterns?: Array<{ kind: string; name: string; planets: string[]; apex?: string; sign?: string; tightness?: number; interpretation?: string }>;
  special_points?: {
    part_of_fortune?: { sign: string; degree: number; meaning?: string };
    vertex?: { sign: string; degree: number; meaning?: string };
    moon_phase_at_birth?: { phase: string; illumination: number; moon_sign: string; cycle_meaning?: string };
    black_moon_lilith?: { sign: string; degree_in_sign: number; meaning?: string };
  };
};

const SIGN_ZH: Record<string, string> = { Aries: "白羊座", Taurus: "金牛座", Gemini: "双子座", Cancer: "巨蟹座", Leo: "狮子座", Virgo: "处女座", Libra: "天秤座", Scorpio: "天蝎座", Sagittarius: "射手座", Capricorn: "摩羯座", Aquarius: "水瓶座", Pisces: "双鱼座" };
const PLANET_ZH: Record<string, string> = { Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星", Jupiter: "木星", Saturn: "土星", Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星", "North Node": "北交点", "South Node": "南交点", Chiron: "凯龙星" };
const ASPECT_ZH: Record<string, string> = { conjunction: "合相", opposition: "对冲", trine: "三分相", square: "四分相", sextile: "六分相", quincunx: "梅花相" };
const ELEMENT_ZH: Record<string, string> = { Fire: "火", Earth: "土", Air: "风", Water: "水" };
const MODALITY_ZH: Record<string, string> = { Cardinal: "基本", Fixed: "固定", Mutable: "变动" };
const PATTERN_ZH: Record<string, string> = { KITE: "风筝格局", T_SQUARE: "T 三角", GRAND_TRINE: "大三角", GRAND_CROSS: "大十字", YOD: "上帝之指", STELLIUM: "群星汇聚", MYSTIC_RECTANGLE: "神秘长方形" };
const SIGN_TRAIT: Record<string, string> = {
  Aries: "直接、主动，习惯先行动再校准", Taurus: "稳定、重感受，倾向用持续投入建立安全感", Gemini: "好奇、敏捷，需要交流与变化保持活力", Cancer: "敏感、保护性强，重视归属感与情绪连接", Leo: "自带表现力，希望通过创造和认可确认价值", Virgo: "观察细致，倾向通过改善细节建立秩序", Libra: "关系感强，擅长平衡观点与营造和谐", Scorpio: "情感浓度高，重视真实、忠诚与深层连接", Sagittarius: "追求自由与意义，靠探索拓宽人生边界", Capricorn: "目标感和责任感强，愿意为长期成果延迟满足", Aquarius: "独立、前瞻，倾向用新方法回应集体议题", Pisces: "感受力和想象力丰富，边界与恢复时间尤其重要",
};
const PLANET_MEANING: Record<string, string> = {
  Sun: "核心身份与生命意志", Moon: "情绪需求与本能反应", Mercury: "思考、学习与表达方式", Venus: "审美、价值观与爱人的方式", Mars: "行动力、欲望与冲突模式", Jupiter: "扩张、信念与机会来源", Saturn: "责任、边界与长期课题", Uranus: "突破、独立与改变方式", Neptune: "想象、共情与理想化", Pluto: "深层力量、控制与蜕变", "North Node": "需要发展的生命方向", "South Node": "熟悉但需要松开的惯性", Chiron: "伤口如何转化为理解力",
};
const HOUSE_MEANING: Record<number, string> = { 1: "自我呈现与身体感", 2: "价值、资源与自我价值", 3: "学习、沟通与近距离环境", 4: "家庭、根基与内在安全", 5: "创作、恋爱与自我表达", 6: "日常、工作习惯与身心维护", 7: "伴侣、合作与关系镜像", 8: "亲密、共享资源与深层转化", 9: "信念、高等学习与远行", 10: "事业、公众角色与长期成就", 11: "社群、朋友与未来愿景", 12: "潜意识、独处与内在整合" };
const ASPECT_TEXT: Record<string, string> = {
  conjunction: "两股能量融合并彼此放大", opposition: "两端形成拉扯，需要在关系与选择中建立平衡", trine: "能量自然流动，是容易被忽略的天赋", square: "摩擦会制造压力，也会逼出行动和成长", sextile: "存在可被主动开发的合作机会", quincunx: "两股能量语言不同，需要持续微调生活方式",
};

export type AstrologyReport = {
  source: { repository: string; license: string; engine: string; precision: string; houseSystem: string };
  timeKnown: boolean;
  bigThree: Array<{ key: string; label: string; sign: string; degree?: number; text: string }>;
  chartMeta: Array<{ label: string; value: string }>;
  planets: Array<{ key: string; label: string; sign: string; degree: number; house?: number; retrograde: boolean; dignity: string; longitude: number; text: string }>;
  elements: Array<{ label: string; value: number }>;
  modalities: Array<{ label: string; value: number }>;
  aspects: Array<{ title: string; orb: number; tone: Tone; text: string }>;
  patterns: Array<{ title: string; planets: string; tone: Tone; text: string }>;
  houses: Array<{ house: number; sign: string; ruler: string; topic: string }>;
  sections: Array<{ title: string; summary: string; evidence: string[] }>;
  specialPoints: Array<{ title: string; value: string; text: string }>;
};

function signName(sign?: string) { return sign ? (SIGN_ZH[sign] ?? sign) : "未知"; }
function planetName(planet?: string) { return planet ? (PLANET_ZH[planet] ?? planet) : "未知"; }
function placementText(name: string, placement?: EnginePlanet) {
  if (!placement) return "盘面中没有返回这一星体的位置。";
  const house = placement.house ? "，落在第" + placement.house + "宫（" + HOUSE_MEANING[placement.house] + "）" : "";
  const retro = placement.retrograde ? "，处于逆行状态，相关能量更偏向内在反思" : "";
  const dignity = placement.dignity ? "，并具有“" + placement.dignity + "”的尊贵状态" : "";
  return planetName(name) + "落在" + signName(placement.sign) + " " + placement.deg_in_sign.toFixed(1) + "°" + house + retro + dignity + "。它掌管" + (PLANET_MEANING[name] ?? "相应人生主题") + "，会以" + (SIGN_TRAIT[placement.sign] ?? "这一星座") + "的方式表现。";
}
function strongest(balance: Record<string, number>) { return Object.entries(balance).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""; }
function aspectsFor(chart: EngineWesternChart, names: string[]) {
  return chart.aspects.filter((aspect) => names.includes(aspect.a) || names.includes(aspect.b)).sort((a, b) => a.orb - b.orb).slice(0, 4).map((aspect) => planetName(aspect.a) + "与" + planetName(aspect.b) + "形成" + (ASPECT_ZH[aspect.aspect] ?? aspect.aspect) + "（容许度 " + aspect.orb.toFixed(1) + "°）");
}

type AstrologyInput = { name: string; birthDate: string; birthTime?: string; lat: number; lon: number; tz: string; timeKnown: boolean };

// 星盘数据确定性:按输入缓存 24h,失败回退旧缓存;并发请求合并为一次外呼。
const reportCache = new Map<string, { report: AstrologyReport; at: number }>();
const inflight = new Map<string, Promise<AstrologyReport>>();
const REPORT_CACHE_TTL = 24 * 3_600_000;

export async function getAstrologyReport(input: AstrologyInput): Promise<AstrologyReport> {
  const key = JSON.stringify([input.name, input.birthDate, input.birthTime ?? "", input.lat, input.lon, input.tz, input.timeKnown]);
  const cached = reportCache.get(key);
  if (cached && Date.now() - cached.at < REPORT_CACHE_TTL) return cached.report;
  const pending = inflight.get(key);
  if (pending) return pending;
  const task = buildAstrologyReport(input)
    .then((report) => {
      reportCache.set(key, { report, at: Date.now() });
      return report;
    })
    .catch((error) => {
      if (cached) return cached.report;
      throw error;
    })
    .finally(() => { inflight.delete(key); });
  inflight.set(key, task);
  return task;
}

async function buildAstrologyReport(input: AstrologyInput): Promise<AstrologyReport> {
  const [year, month, day] = input.birthDate.split("-").map(Number);
  const [hour, minute] = (input.birthTime || "12:00").split(":").map(Number);
  const endpoint = process.env.ASTROLOGY_ENGINE_URL || "https://astro-api-a2rc.onrender.com/chart/natal";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...(process.env.ASTROLOGY_ENGINE_TOKEN ? { authorization: "Bearer " + process.env.ASTROLOGY_ENGINE_TOKEN } : {}) },
    body: JSON.stringify({ name: input.name, year, month, day, hour, minute, lat: input.lat, lng: input.lon, tz: input.tz, time_known: input.timeKnown, systems: ["western"], house_system: "whole-sign" }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("ASTROLOGY_ENGINE_HTTP_" + response.status);
  const data = await response.json() as EngineResponse;
  const chart = data.charts?.western;
  if (!chart?.planets?.Sun || !chart.planets.Moon) throw new Error("ASTROLOGY_ENGINE_INVALID_RESPONSE");

  const planets = Object.entries(chart.planets).map(([key, planet]) => ({
    key, label: planetName(key), sign: signName(planet.sign), degree: planet.deg_in_sign, house: planet.house, retrograde: Boolean(planet.retrograde), dignity: planet.dignity || "", longitude: planet.abs_lon, text: placementText(key, planet),
  }));
  const sun = chart.planets.Sun;
  const moon = chart.planets.Moon;
  const mercury = chart.planets.Mercury;
  const venus = chart.planets.Venus;
  const mars = chart.planets.Mars;
  const jupiter = chart.planets.Jupiter;
  const saturn = chart.planets.Saturn;
  const northNode = chart.planets["North Node"];
  const element = strongest(chart.element_balance);
  const modality = strongest(chart.modality_balance);
  const rising = chart.ascendant?.sign || chart.big_three.rising;

  const bigThree = [
    { key: "sun", label: "太阳 · 核心自我", sign: signName(sun.sign), degree: sun.deg_in_sign, text: SIGN_TRAIT[sun.sign] },
    { key: "moon", label: "月亮 · 情绪内核", sign: signName(moon.sign), degree: moon.deg_in_sign, text: SIGN_TRAIT[moon.sign] },
    ...(input.timeKnown && rising ? [{ key: "rising", label: "上升 · 外在方式", sign: signName(rising), degree: chart.ascendant?.deg_in_sign, text: SIGN_TRAIT[rising] }] : []),
  ];
  const aspects = chart.aspects.sort((a, b) => a.orb - b.orb).slice(0, 14).map((aspect) => {
    const hard = aspect.aspect === "square" || aspect.aspect === "opposition" || aspect.aspect === "quincunx";
    return { title: planetName(aspect.a) + " " + (ASPECT_ZH[aspect.aspect] ?? aspect.aspect) + " " + planetName(aspect.b), orb: aspect.orb, tone: (hard ? "growth" : aspect.aspect === "trine" || aspect.aspect === "sextile" ? "strength" : "neutral") as Tone, text: ASPECT_TEXT[aspect.aspect] ?? "这组能量会彼此影响。" };
  });
  const patterns = (data.aspect_patterns ?? []).slice(0, 8).map((pattern) => ({ title: PATTERN_ZH[pattern.kind] ?? pattern.name, planets: pattern.planets.map(planetName).join(" · "), tone: (pattern.kind === "T_SQUARE" || pattern.kind === "GRAND_CROSS" ? "growth" : "strength") as Tone, text: pattern.kind === "STELLIUM" ? "能量集中在" + signName(pattern.sign) + "，这部分人生主题会被持续放大。" : pattern.apex ? "格局焦点落在" + planetName(pattern.apex) + "，它是释放整组能量的关键。" : "多颗星体形成稳定结构，构成命盘的重要主线。" }));
  const houses = input.timeKnown ? Object.entries(chart.houses ?? {}).map(([house, value]) => ({ house: Number(house), sign: signName(value.sign), ruler: planetName(value.ruler), topic: HOUSE_MEANING[Number(house)] ?? "人生领域" })) : [];
  const special = data.special_points;
  const specialPoints = [
    special?.part_of_fortune ? { title: "福点", value: signName(special.part_of_fortune.sign) + " " + special.part_of_fortune.degree.toFixed(1) + "°", text: "象征更容易感到顺流、满足与自然丰盛的位置。" } : null,
    special?.vertex ? { title: "宿命点", value: signName(special.vertex.sign) + " " + special.vertex.degree.toFixed(1) + "°", text: "常用于观察重要相遇与被外部事件推动的生命节点。" } : null,
    special?.moon_phase_at_birth ? { title: "出生月相", value: special.moon_phase_at_birth.phase + " · " + special.moon_phase_at_birth.illumination.toFixed(0) + "%", text: "出生月亮位于" + signName(special.moon_phase_at_birth.moon_sign) + "，生命节奏偏向“" + (special.moon_phase_at_birth.cycle_meaning ?? "持续发展") + "”。" } : null,
    special?.black_moon_lilith ? { title: "黑月莉莉丝", value: signName(special.black_moon_lilith.sign) + " " + special.black_moon_lilith.degree_in_sign.toFixed(1) + "°", text: "象征不愿被规训的本能、被压抑的欲望与更原始的真实感。" } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const sections = [
    { title: "核心人格", summary: "太阳" + signName(sun.sign) + "定义核心意志，月亮" + signName(moon.sign) + "描述情绪需要" + (rising ? "，上升" + signName(rising) + "则是外界最先接触到的样子" : "。因出生时间未确认，上升与宫位不参与判断") + "。", evidence: [placementText("Sun", sun), placementText("Moon", moon), ...aspectsFor(chart, ["Sun", "Moon"])] },
    { title: "思维与表达", summary: mercury ? "水星落在" + signName(mercury.sign) + "，TA 习惯以" + (SIGN_TRAIT[mercury.sign] ?? "对应星座") + "的方式组织信息。" : "水星位置暂不可用。", evidence: [placementText("Mercury", mercury), ...aspectsFor(chart, ["Mercury"])] },
    { title: "爱与吸引力", summary: "金星描述喜欢和被吸引的方式，火星描述主动争取、欲望与冲突反应；两者共同构成亲密关系的行动语言。", evidence: [placementText("Venus", venus), placementText("Mars", mars), ...aspectsFor(chart, ["Venus", "Mars"])] },
    { title: "事业与公众角色", summary: input.timeKnown && chart.midheaven ? "天顶落在" + signName(chart.midheaven.sign) + "，事业需要把" + (SIGN_TRAIT[chart.midheaven.sign] ?? "相应特质") + "发展为稳定的公众价值。" : "出生时间未确认，报告以木星、土星和行星能力为主，不判断天顶与第十宫。", evidence: [placementText("Jupiter", jupiter), placementText("Saturn", saturn), ...aspectsFor(chart, ["Jupiter", "Saturn"])] },
    { title: "优势与成长课题", summary: "命盘以" + (ELEMENT_ZH[element] ?? element) + "元素、" + (MODALITY_ZH[modality] ?? modality) + "模式最突出；优势来自重复能量，成长则来自不熟悉的部分。", evidence: ["元素结构：" + Object.entries(chart.element_balance).map(([key, value]) => (ELEMENT_ZH[key] ?? key) + value).join(" · "), "模式结构：" + Object.entries(chart.modality_balance).map(([key, value]) => (MODALITY_ZH[key] ?? key) + value).join(" · "), placementText("North Node", northNode)] },
  ];

  return {
    source: { repository: "aryaminus/astro", license: "MIT", engine: data._meta?.engine_backend ?? "builtin", precision: data._meta?.precision_note ?? "按星座与宫位级别计算", houseSystem: data._meta?.house_system ?? chart.system },
    timeKnown: Boolean(data.time_info?.time_known && input.timeKnown),
    bigThree,
    chartMeta: [
      { label: "命主星", value: planetName(chart.chart_ruler) },
      { label: "天顶", value: input.timeKnown && chart.midheaven ? signName(chart.midheaven.sign) + " " + chart.midheaven.deg_in_sign.toFixed(1) + "°" : "时辰未知" },
      { label: "主导元素", value: ELEMENT_ZH[element] ?? element },
      { label: "主导模式", value: MODALITY_ZH[modality] ?? modality },
    ],
    planets,
    elements: Object.entries(chart.element_balance).map(([key, value]) => ({ label: ELEMENT_ZH[key] ?? key, value })),
    modalities: Object.entries(chart.modality_balance).map(([key, value]) => ({ label: MODALITY_ZH[key] ?? key, value })),
    aspects,
    patterns,
    houses,
    sections,
    specialPoints,
  };
}

// 星盘报告纯文本摘要:追问接口的权威上下文(与报告页同源)。
export function formatAstrologyReport(report: AstrologyReport): string {
  const lines: string[] = [];
  lines.push(`三主星:${report.bigThree.map(item => `${item.label}${item.sign}`).join(" · ")}`);
  lines.push(`盘面信息:${report.chartMeta.map(item => `${item.label}=${item.value}`).join(" · ")}${report.timeKnown ? "" : "(时辰未知,宫位相关内容仅供参考)"}`);
  lines.push("星体落座:");
  for (const planet of report.planets) {
    lines.push(`${planet.label}落${planet.sign} ${planet.degree.toFixed(1)}°${planet.house ? ` 第${planet.house}宫` : ""}${planet.retrograde ? " 逆行" : ""}${planet.dignity ? ` ${planet.dignity}` : ""}:${planet.text}`);
  }
  lines.push(`元素分布:${report.elements.map(item => `${item.label}${item.value}%`).join(" · ")};模式分布:${report.modalities.map(item => `${item.label}${item.value}%`).join(" · ")}`);
  lines.push("主要相位:");
  for (const aspect of report.aspects) lines.push(`${aspect.title}(${aspect.orb.toFixed(1)}°):${aspect.text}`);
  if (report.patterns.length) {
    lines.push("星盘格局:");
    for (const pattern of report.patterns) lines.push(`${pattern.title}(${pattern.planets}):${pattern.text}`);
  }
  lines.push("宫位:");
  for (const house of report.houses) lines.push(`第${house.house}宫 ${house.sign}(主题:${house.topic})`);
  lines.push("解读板块:");
  for (const section of report.sections) lines.push(`${section.title}:${section.summary} 依据:${section.evidence.join(";")}`);
  return lines.join("\n");
}
