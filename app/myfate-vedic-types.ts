// ── Vedic composite (version 4) ────────────────────────────────────────────

export type VedicChartSummary = {
  name: string;
  lagna: string;
  lagnaNakshatra: string;
  moonSign: string;
  moonNakshatra: string;
  moonPada: number;
  sunSign: string;
  venusSign: string;
  marsSign: string;
  jupiterSign: string;
  saturnSign: string;
};

export type VedicAshtakootaItem = {
  item: string;
  tier: string;
  dim: string;
};

export type VedicOverlayItem = {
  planet: string;
  sign: string;
  house_in_dst: number;
  dignity: string;
  roles: string;
};

export type VedicDimension = {
  label: "情绪安全" | "吸引与亲密" | "沟通修复" | "长期承载" | "现实协作" | "当前时机";
  tier: string;
  supportingEvidence: string;
  limitingEvidence: string;
  directionGap: string;
  confidence: "high" | "medium" | "low";
  realityCheck: string;
};

export const vedicRelationshipTypes = [
  "高吸引高承载",
  "高吸引低承载",
  "低戏剧高承载",
  "成长催化型",
  "现实协作型",
  "节奏错位型",
  "高消耗修复不足",
] as const;

export type VedicRelationshipType = typeof vedicRelationshipTypes[number];

export type VedicCompositeResult = {
  version: 4;
  starId: string;
  mode: "vedic";
  headline: string;
  insight: string;
  tension: string;
  relationshipType: VedicRelationshipType;
  relationshipSummary: string;
  userChart: VedicChartSummary;
  starChart: VedicChartSummary;
  dimensions: VedicDimension[];
  ashtakoota: VedicAshtakootaItem[];
  overlayHighlights: {
    userToStar: VedicOverlayItem[];
    starToUser: VedicOverlayItem[];
  };
  timingNotes: string[];
  interpretationSource: "deepseek" | "template";
};

// ── Serialization (v4) ─────────────────────────────────────────────────────

export const VEDIC_COMPOSITE_PREFIX = "MYFATE_COMPOSITE_V4\n";

export function serializeVedicResult(result: VedicCompositeResult) {
  return `${VEDIC_COMPOSITE_PREFIX}${JSON.stringify(result)}`;
}

export function parseVedicResult(value: string | null | undefined): VedicCompositeResult | null {
  if (!value?.startsWith(VEDIC_COMPOSITE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(VEDIC_COMPOSITE_PREFIX.length)) as VedicCompositeResult;
    if (parsed?.version !== 4 || !Array.isArray(parsed.dimensions) || !parsed.userChart || !parsed.starChart) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── English → Chinese display mappings ─────────────────────────────────────

export const vedicSignZh: Record<string, string> = {
  Aries: "白羊座", Taurus: "金牛座", Gemini: "双子座", Cancer: "巨蟹座",
  Leo: "狮子座", Virgo: "处女座", Libra: "天秤座", Scorpio: "天蝎座",
  Sagittarius: "射手座", Capricorn: "摩羯座", Aquarius: "水瓶座", Pisces: "双鱼座",
};

export const vedicNakshatraZh: Record<string, string> = {
  "Ashwini": "Ashwini", "Bharani": "Bharani", "Krittika": "Krittika", "Rohini": "Rohini",
  "Mrigashira": "Mrigashira", "Ardra": "Ardra", "Punarvasu": "Punarvasu", "Pushya": "Pushya",
  "Ashlesha": "Ashlesha", "Magha": "Magha", "Purva Phalguni": "P.Phalguni", "Uttara Phalguni": "U.Phalguni",
  "Hasta": "Hasta", "Chitra": "Chitra", "Swati": "Swati", "Vishakha": "Vishakha",
  "Anuradha": "Anuradha", "Jyeshtha": "Jyeshtha", "Mula": "Mula", "Purva Ashadha": "P.Ashadha",
  "Uttara Ashadha": "U.Ashadha", "Shravana": "Shravana", "Dhanishta": "Dhanishta",
  "Shatabhisha": "Shatabhisha", "Purva Bhadrapada": "P.Bhadrapada", "Uttara Bhadrapada": "U.Bhadrapada", "Revati": "Revati",
};

export const vedicPlanetZh: Record<string, string> = {
  Sun: "太阳", Moon: "月亮", Mars: "火星", Mercury: "水星",
  Jupiter: "木星", Venus: "金星", Saturn: "土星", Rahu: "罗睺", Ketu: "计都",
  "AL": "Arudha Lagna", "UL": "Upapada",
};

export function vedicHouseLabel(house: number) {
  return `第${house}宫`;
}
