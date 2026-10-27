// 双人解读排盘:把出生资料折算为子平八字命盘与命局画像。
// 原双星合盘的交叉结构与时间层计算已随功能下线移除,现仅服务自填解读
// (单人四柱展示、双人确认页资料卡)。
import { buildBaziChart } from "./myfate-bazi-engine";
import { buildBaziLifeProfile } from "./myfate-bazi-profile";
import type { CelebrityVedicBirth } from "./myfate-stars-server";

export function buildDualChart(birth: CelebrityVedicBirth) {
  const chart = buildBaziChart({
    birthDate: birth.birthDate,
    birthTime: birth.birthTime || "12:00",
    gender: birth.gender === "female" ? "female" : "male",
    city: { id: birth.starId, name: birth.birthPlace, lat: birth.lat, lon: birth.lon, tz: birth.tz },
  });
  return { chart, profile: buildBaziLifeProfile(chart) };
}
