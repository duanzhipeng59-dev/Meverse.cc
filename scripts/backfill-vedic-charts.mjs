// Backfills Vedic birth data + precomputed charts into celebrity_profiles.
//
// Usage:
//   1. Put birth data in scripts/vedic-birth-data.json (see vedic-birth-data.example.json)
//   2. VEDIC_SERVICE_URL=http://127.0.0.1:8765 node scripts/backfill-vedic-charts.mjs
//
// Rows without a birth-time entry keep null fields and stay on the BaZi fallback.

import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

async function loadLocalEnvironment() {
  try {
    const contents = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch {
    // CI provides environment variables directly.
  }
}

await loadLocalEnvironment();

const SERVICE_URL = (process.env.VEDIC_SERVICE_URL ?? "http://127.0.0.1:8765").replace(/\/$/u, "");
const dataPath = new URL("./vedic-birth-data.json", import.meta.url);

let birthData = {};
try {
  birthData = JSON.parse(readFileSync(dataPath, "utf8"));
} catch {
  console.log("No scripts/vedic-birth-data.json found — only backfilling charts for rows that already have birth data.");
}

async function computeChart({ name, date, time, lat, lon, tz }) {
  const response = await fetch(`${SERVICE_URL}/chart`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(process.env.VEDIC_SERVICE_TOKEN ? { "x-vedic-token": process.env.VEDIC_SERVICE_TOKEN } : {}) },
    body: JSON.stringify({ name, date, time, lat, lon, tz, precision: "minute" }),
    signal: AbortSignal.timeout(240_000),
  });
  if (!response.ok) throw new Error(`chart failed ${response.status}: ${await response.text()}`);
  return response.json();
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY missing");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

// 1. Apply birth data patches.
for (const [starId, entry] of Object.entries(birthData)) {
  const { error } = await supabase.from("celebrity_profiles").update({
    birth_time: entry.time,
    birth_place: entry.place ?? "",
    birth_lat: entry.lat,
    birth_lon: entry.lon,
    birth_tz: entry.tz,
    vedic_chart: null,
  }).eq("id", starId);
  if (error) throw error;
  console.log(`birth data updated: ${starId}`);
}

// 2. Precompute charts for all rows with complete birth data but no cache.
const { data: rows, error } = await supabase
  .from("celebrity_profiles")
  .select("id,name,birth_date,birth_time,birth_lat,birth_lon,birth_tz,vedic_chart")
  .not("birth_time", "is", null)
  .not("birth_lat", "is", null)
  .not("birth_tz", "is", null)
  .is("vedic_chart", null);
if (error) throw error;

for (const row of rows) {
  try {
    const chart = await computeChart({
      name: row.name,
      date: row.birth_date,
      time: row.birth_time,
      lat: row.birth_lat,
      lon: row.birth_lon,
      tz: row.birth_tz,
    });
    const { error: updateError } = await supabase.from("celebrity_profiles")
      .update({ vedic_chart: { structuredMd: chart.structuredMd, summary: chart.summary } })
      .eq("id", row.id);
    if (updateError) throw updateError;
    console.log(`chart cached: ${row.name} (${row.id})`);
  } catch (cause) {
    console.error(`chart failed for ${row.name} (${row.id}):`, cause.message ?? cause);
  }
}
console.log("done");
