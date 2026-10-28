// 解读报告生成管线(自填人物):
// 单人复用 star-ai-generator(引擎事实+AI 文案+合并骨架),双人复用 dual 引擎的
// generateContent(输入 birth 由自填 subject 转换,不经 celebrity 数据)。
import { vedicCities } from "./myfate-cities";
import { buildBaziChart } from "./myfate-bazi-engine";
import { buildBaziLifeProfile } from "./myfate-bazi-profile";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import { buildStaticReadingFacts, generateStaticReading } from "./myfate-static-reading";
import { getReadingReport, updateReadingReport, type ReadingSubject } from "./myfate-reading-server";
import type { CelebrityVedicBirth } from "./myfate-stars-server";
import { generateBaziMatchReport } from "./myfate-bazi-dual-report";

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

function fourPillars(subject: ReadingSubject) {
  const birth = subjectToBirth(subject);
  const chart = buildBaziChart({ birthDate: birth.birthDate, birthTime: birth.birthTime, gender: birth.gender === "female" ? "female" : "male", city: { id: birth.starId, name: birth.birthPlace, lat: birth.lat, lon: birth.lon, tz: birth.tz } });
  return { name: subject.name, birthDate: subject.birthDate, gender: subject.gender, pillars: chart.pillars.map((pillar) => ({ label: pillar.label, ganzhi: pillar.ganzhi })) };
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
      // 单次调用直出模版化九章节大报告,30k tokens 防截断
      const content = await generateStaticReading(
        async (system, prompt) => (await generateChatText(system, [{ role: "user", content: prompt }], { provider: "gemini", temperature: 0.35, maxTokens: 30000, json: true })).content,
        facts,
        profile,
      );
      await updateReadingReport(reportId, { status: "ready", content, error: null });
      return;
    }

    const subjectB = report.subjectB;
    if (!subjectB) throw new Error("SUBJECT_B_MISSING");
    // 新版双人合盘：四柱作为唯一事实来源，模型输出前端可直接消费的结构化报告。
    const content = await generateBaziMatchReport(
      { ...subjectA, fourPillars: fourPillars(subjectA).pillars },
      { ...subjectB, fourPillars: fourPillars(subjectB).pillars },
    );
    await updateReadingReport(reportId, { status: "ready", content, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "READING_GENERATE_FAILED";
    console.error("Reading generation failed", reportId, message);
    await updateReadingReport(reportId, { status: "failed", error: message.slice(0, 200) });
  }
}
