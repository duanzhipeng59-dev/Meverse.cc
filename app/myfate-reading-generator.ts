// 解读报告生成管线(自填人物):
// 单人走 V3 按章并行管线(引擎排盘 → 命理规则层 → 9 章并行 AI → 一致性校验
// → 违规章节定向重生成);双人合盘沿用 dual 引擎的单次直出管线,行为不变。
import { vedicCities } from "./myfate-cities";
import { buildBaziChart } from "./myfate-bazi-engine";
import { buildBaziLifeProfile } from "./myfate-bazi-profile";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import { buildBaziJudgment } from "./bazi-rules/judgment";
import { generateStaticReadingV3 } from "./myfate-section-pipeline";
import { getReadingReport, refundReadingCredit, updateReadingReport, type ReadingSubject } from "./myfate-reading-server";
import type { CelebrityVedicBirth } from "./myfate-stars-server";
import { generateDualReading } from "./myfate-dual-reading";

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
  try {
    const subjectA = report.subjectA;
    const birthA = subjectToBirth(subjectA);

    if (report.mode === "single") {
      const chart = buildBaziChart({ birthDate: birthA.birthDate, birthTime: birthA.birthTime, gender: birthA.gender === "female" ? "female" : "male", city: { id: birthA.starId, name: birthA.birthPlace, lat: birthA.lat, lon: birthA.lon, tz: birthA.tz } });
      const profile = buildBaziLifeProfile(chart);
      // V3:命理规则层统一判断对象 → 9 章并行生成 → 一致性校验定向修复。
      // 每章独立调用(单章输出远小于整篇 30k),总预算 240s 由管线内部守卫。
      const judgment = buildBaziJudgment(chart, profile);
      const content = await generateStaticReadingV3(
        async (system, prompt) => (await generateChatText(system, [{ role: "user", content: prompt }], { provider: "gemini", temperature: 0.35, maxTokens: 12000, json: true })).content,
        judgment,
      );
      await updateReadingReport(reportId, { status: "ready", content, error: null });
      return;
    }

    const subjectB = report.subjectB;
    if (!subjectB) throw new Error("SUBJECT_B_MISSING");
    // 双人合盘:与个人解读同构的蒸馏管线(双方排盘+跨盘关系事实→模版→表达层校验)。
    const content = await generateDualReading(subjectA, subjectB);
    await updateReadingReport(reportId, { status: "ready", content, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "READING_GENERATE_FAILED";
    console.error("Reading generation failed", reportId, message);
    await updateReadingReport(reportId, { status: "failed", error: message.slice(0, 200) });
    // 生成失败退回扣掉的 1 次额度(幂等,未扣过费则 no-op);退款失败不影响状态落库
    await refundReadingCredit(report.userId, reportId).catch(() => undefined);
  }
}
