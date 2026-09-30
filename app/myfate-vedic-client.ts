// Server-side client for the local vedic-compute-service (FastAPI wrapper
// around vedic-astro-skills). When the service is unreachable or unconfigured,
// callers fall back to the legacy BaZi three-pillar flow.

const CHART_TIMEOUT_MS = 240_000;

export type VedicServiceChart = {
  structuredMd: string;
  summary: {
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
    rahuSign: string;
    ketuSign: string;
    planetHouses: Record<string, number>;
  };
};

export type VedicServiceSynastry = {
  markdown: string;
  sections: {
    ashtakoota: Array<{ item: string; tier: string; dim: string }>;
    overlayAToB: Array<{ planet: string; sign: string; house_in_dst: number; dignity: string; roles: string }>;
    overlayBToA: Array<{ planet: string; sign: string; house_in_dst: number; dignity: string; roles: string }>;
    crossAspects: Array<{ a: string; b: string; kind: string; orb: string }>;
    sameHouseResonance: Array<{ planet: string; house: number }>;
    drishtiAToB: Array<{ a: string; point: string; nature: string; dignity: string }>;
    drishtiBToA: Array<{ a: string; point: string; nature: string; dignity: string }>;
    keyPointsAToB: Array<{ point: string; house_in_b: number }>;
    keyPointsBToA: Array<{ point: string; house_in_b: number }>;
    dashaLines: string[];
    dashaNotes: string[];
  };
  chartSummary: {
    a: { label: string; lagna: string; moonNakshatra: string; moonPada: number; ul: string | null; dk: string | null };
    b: { label: string; lagna: string; moonNakshatra: string; moonPada: number; ul: string | null; dk: string | null };
  };
};

export type VedicBirthInput = {
  name: string;
  date: string;
  time: string;
  lat: number;
  lon: number;
  tz: string;
};

export function vedicServiceConfigured() {
  return Boolean(process.env.VEDIC_SERVICE_URL);
}

function serviceHeaders() {
  const token = process.env.VEDIC_SERVICE_TOKEN;
  return token ? { "x-vedic-token": token } : undefined;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const base = process.env.VEDIC_SERVICE_URL!.replace(/\/$/u, "");
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...serviceHeaders() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CHART_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`VEDIC_SERVICE_HTTP_${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  return response.json() as Promise<T>;
}

export async function computeVedicChart(input: VedicBirthInput): Promise<VedicServiceChart> {
  return postJson<VedicServiceChart>("/chart", { ...input, precision: "minute" });
}

export async function computeVedicSynastry(aMd: string, bMd: string, nameA: string, nameB: string): Promise<VedicServiceSynastry> {
  return postJson<VedicServiceSynastry>("/synastry", { a: aMd, b: bMd, nameA, nameB });
}
