// 解读报告生成管线(自填人物):
// 单人走 V3 按章并行管线(引擎排盘 → 命理规则层 → 9 章并行 AI → 一致性校验
// → 违规章节定向重生成);双人合盘同构(双方锚点+跨盘关系 → 9 章并行)。
// 旧 generateDualReading(myfate-dual-reading.ts)保留导出供 scripts 预览使用。
import { vedicCities } from "./myfate-cities";
import { buildBaziChart } from "./myfate-bazi-engine";
import { buildBaziLifeProfile } from "./myfate-bazi-profile";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import { buildBaziJudgment } from "./bazi-rules/judgment";
import { buildDualJudgment } from "./bazi-rules/dual-judgment";
import { generateStaticReadingV3 } from "./myfate-section-pipeline";
import { generateDualReadingV3 } from "./myfate-dual-pipeline";
import { getReadingReport, refundReadingCredit, updateReadingReport, type ReadingSubject } from "./myfate-reading-server";
import type { CelebrityVedicBirth } from "./myfate-stars-server";

// subject → 引擎 birth(城市坐标只认站点城市库,忽略任意外部坐标)
function subjectToBirth(subject: ReadingSubject): CelebrityVedicBirth {
  const city = vedicCities.find((item) => item.id === subject.cityId)
    ?? { id: subject.cityId, name: subject.cityName, lat: 37.5665, lon: 126.978, tz: "Asia/Seoul" };
  return {
    starId: `reading-${city.id}`,
    name: subject.name,
    birthDate: subject.birthDate,
    birthTime: subject.birthTime,
    birthPlace: subject.cityName,
    lat: city.lat,
    lon: city.lon,
    tz: city.tz,
    gender: subject.gender,
  };
}

export async function runReadingGeneration(reportId: string): Promise<void> {
  const report = await getReadingReport(reportId);
  if (!report) return;
  // 单/双管线共用同一 Gemini 通道:每章独立调用(单章输出远小于整篇 30k),
  // 总预算 240s 由 section-pipeline-core 守卫。
  const callModel = async (system: string, prompt: string) =>
    (await generateChatText(system, [{ role: "user", content: prompt }], { provider: "gemini", temperature: 0.35, maxTokens: 12000, json: true })).content;
  try {
    const subjectA = report.subjectA;
    const birthA = subjectToBirth(subjectA);
    const chart = buildBaziChart({ birthDate: birthA.birthDate, birthTime: birthA.birthTime, gender: birthA.gender === "female" ? "female" : "male", city: { id: birthA.starId, name: birthA.birthPlace, lat: birthA.lat, lon: birthA.lon, tz: birthA.tz } });

    if (report.mode === "single") {
      const profile = buildBaziLifeProfile(chart);
      // V3:命理规则层统一判断对象 → 9 章并行生成 → 一致性校验定向修复。
      const judgment = buildBaziJudgment(chart, profile);
      const content = await generateStaticReadingV3(callModel, judgment);
      await updateReadingReport(reportId, { status: "ready", content, error: null });
      return;
    }

    const subjectB = report.subjectB;
    if (!subjectB) throw new Error("SUBJECT_B_MISSING");
    // 双人合盘 V3:双方规则层锚点(与单人报告同口径)+ 跨盘关系 → 9 章并行 →
    // 双人一致性校验 → 违规章节定向重生成。输出 dual-reading-v1,前端零改动。
    const birthB = subjectToBirth(subjectB);
    const chartB = buildBaziChart({ birthDate: birthB.birthDate, birthTime: birthB.birthTime, gender: birthB.gender === "female" ? "female" : "male", city: { id: birthB.starId, name: birthB.birthPlace, lat: birthB.lat, lon: birthB.lon, tz: birthB.tz } });
    const dualJudgment = buildDualJudgment(chart, chartB, subjectA.name, subjectB.name);
    const content = await generateDualReadingV3(callModel, dualJudgment);
    await updateReadingReport(reportId, { status: "ready", content, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "READING_GENERATE_FAILED";
    console.error("Reading generation failed", reportId, message);
    await updateReadingReport(reportId, { status: "failed", error: message.slice(0, 200) });
    // 生成失败退回扣掉的 1 次额度(幂等,未扣过费则 no-op);退款失败不影响状态落库
    await refundReadingCredit(report.userId, reportId).catch(() => undefined);
  }
}
