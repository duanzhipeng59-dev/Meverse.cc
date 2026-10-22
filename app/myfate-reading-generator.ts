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

async function generateFourPillarDualReport(subjectA: ReadingSubject, subjectB: ReadingSubject): Promise<string> {
  const input = { personA: fourPillars(subjectA), personB: fourPillars(subjectB) };
  const prompt = `请仅依据下面两人的四柱原始信息，直接写出一份完整、专业、自然的八字双人合盘报告。\n\n不要要求或假设大运、流年、神煞、十神扩展、五行评分或其他未提供的数据；如果信息不足，就明确说明边界。可以自由使用 Markdown 标题、列表和段落，内容长度与章节组织由你判断，不要输出 JSON 包装。\n\n${JSON.stringify(input, null, 2)}`;
  const result = await generateChatText("你是专业、克制、重视事实边界的八字合盘顾问。", [{ role: "user", content: prompt }], { temperature: 0.65, maxTokens: 12000 });
  return result.content;
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
    // 自填双人合盘只计算双方四柱；后续婚恋解释完全交给模型，不预先计算岁运与扩展结构。
    const content = await generateFourPillarDualReport(subjectA, subjectB);
    await updateReadingReport(reportId, { status: "ready", content, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "READING_GENERATE_FAILED";
    console.error("Reading generation failed", reportId, message);
    await updateReadingReport(reportId, { status: "failed", error: message.slice(0, 200) });
  }
}
