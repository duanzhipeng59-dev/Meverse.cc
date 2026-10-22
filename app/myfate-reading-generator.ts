// 解读报告生成管线(自填人物):
// 单人复用 star-ai-generator(引擎事实+AI 文案+合并骨架),双人复用 dual 引擎的
// generateContent(输入 birth 由自填 subject 转换,不经 celebrity 数据)。
import { vedicCities } from "./myfate-cities";
import { buildBaziChart } from "./myfate-bazi-engine";
import { buildBaziLifeProfile } from "./myfate-bazi-profile";
import { buildDualChart, buildDualStructure } from "./myfate-dual-engine";
import { buildPersonTimeline, computeAvailableRange, personAnnualRange } from "./myfate-dual-timeline";
import { generateContent as generateDualContent } from "./myfate-dual-generator";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import { buildStaticReadingFacts, generateStaticReading } from "./myfate-static-reading";
import { getReadingReport, updateReadingReport, type ReadingSubject } from "./myfate-reading-server";
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
  try {
    const subjectA = report.subjectA;
    const birthA = subjectToBirth(subjectA);

    if (report.mode === "single") {
      const chart = buildBaziChart({ birthDate: birthA.birthDate, birthTime: birthA.birthTime, gender: birthA.gender === "female" ? "female" : "male", city: { id: birthA.starId, name: birthA.birthPlace, lat: birthA.lat, lon: birthA.lon, tz: birthA.tz } });
      const profile = buildBaziLifeProfile(chart);
      const facts = buildStaticReadingFacts(chart, profile);
      // 个人解读固定用 Gemini(双人合盘与其余 AI 功能仍走 MYFATE_AI_PROVIDER,默认 DeepSeek);
      // 模版化九章节(每章 2-8 小节)输出更长,16k tokens 防截断
      const content = await generateStaticReading(
        async (system, prompt) => (await generateChatText(system, [{ role: "user", content: prompt }], { provider: "gemini", temperature: 0.35, maxTokens: 16000, json: true })).content,
        facts,
        profile,
      );
      await updateReadingReport(reportId, { status: "ready", content, error: null });
      return;
    }

    const subjectB = report.subjectB;
    if (!subjectB) throw new Error("SUBJECT_B_MISSING");
    const birthB = subjectToBirth(subjectB);
    const dualA = buildDualChart(birthA);
    const dualB = buildDualChart(birthB);
    const structure = buildDualStructure(birthA, birthB, dualA.chart, dualB.chart, dualA.profile, dualB.profile);
    const currentYear = new Date().getFullYear();
    const baseRange = personAnnualRange(currentYear);
    const range = computeAvailableRange(baseRange, baseRange);
    const timelineA = buildPersonTimeline(dualA.chart, range ?? baseRange);
    const timelineB = buildPersonTimeline(dualB.chart, range ?? baseRange);
    const content = await generateDualContent(structure, timelineA, timelineB, range, { dualType: report.dualType });
    await updateReadingReport(reportId, { status: "ready", content, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "READING_GENERATE_FAILED";
    console.error("Reading generation failed", reportId, message);
    await updateReadingReport(reportId, { status: "failed", error: message.slice(0, 200) });
  }
}
