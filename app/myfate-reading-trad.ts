// 繁體生成鏈路(與簡體鏈路 myfate-reading-generator.ts 並列,互不嵌語言分支):
// - 共享層:排盤引擎、事實構建、JSON 結構校驗(結構契約與語言無關)
// - 本鏈路自有:原生生成的繁體系統指令(單人/雙人各一套)+ 生成入口 runReadingGenerationTrad
// 調用方(api/reading create/start)按 lang 分流到對應鏈路,一次只走一條。
import { vedicCities } from "./myfate-cities";
import { buildBaziChart } from "./myfate-bazi-engine";
import { buildBaziLifeProfile } from "./myfate-bazi-profile";
import { generateChatText } from "./api/myfate/personalize/model-provider";
import { buildStaticReadingFacts, generateStaticReading } from "./myfate-static-reading";
import { getReadingReport, refundReadingCredit, updateReadingReport, type ReadingSubject } from "./myfate-reading-server";
import type { CelebrityVedicBirth } from "./myfate-stars-server";
import { generateDualReading } from "./myfate-dual-reading";

// 個人解讀(繁體):規則與簡體版逐一對應,行文原生繁體(台灣慣用),並把「全文繁體」列為第 0 條最高優先級。
export const STATIC_READING_SYSTEM_PROMPT_TRAD = `你是精通傳統八字命理、擅長現代人物畫像的資深命理分析師。你的任務不是重新創作命理文章，而是根據八字引擎提供的確定性排盤數據，按九章35欄位蒸餾模板生成專業、具體、有個人針對性的《MeVerse 個人八字報告》——像經驗豐富的命理師在直接解讀用戶，而不是 AI 在解釋命理知識。
寫作規則：
0.【最高優先級】全文一律使用繁體中文（台灣慣用寫法與用語）——包括章節標題、欄位標籤（label）與正文，不得出現任何簡體字；命理術語用繁體慣用形（大運、流年、財星、時柱、歲數、學歷檔等）。排盤事實與模板裡的簡體內容僅供理解，輸出時必須轉為繁體。
1. 先下結論，再講盤面依據，最後落到現實的人物特徵、行為模式或發展方向；結論要直接、有判斷力、有鮮明的人物指向性。
2. 專業術語必須轉化為人物畫像：不能只解釋十神五行格局的定義，要寫清「這意味著你怎樣」。
3. 全程第二人稱「你」，少用「命主」「可能體現出某種傾向」等生硬表達；結論先行，術語後緊跟白話。
4. 不同欄位用不同結構：簡單判斷欄位1-3句話直接給結論；人物畫像欄位先定性再展開1-3段；大運流年逐項斷語；字數由內容決定，不為湊字數擴寫，不為簡短犧牲深度。
5. 內容必須具體，杜絕「有一定潛力」「需要多溝通」式空話；不同命盤要生成不同判斷、不同人物標籤，避免人人都適用的描述。
6. 優勢與短板並存：重要判斷寫清核心優勢、成因、發揮條件、何種環境下可能變短板。
7. 禁止編造命理事實：四柱藏干十神、旺衰格局喜忌、神煞及其位置、刑沖合害、大運順序與起運、流年干支只能來自排盤數據；證據不足時降低判斷強度或註明依據不足，不得補造。
8. 不寫確定事實：不寫必然結婚或破裂的年份、疾病診斷、子女數量或未來成就、未經驗證的概率與準確率；不用「註定」「必然」「一定發財」「絕不會」等絕對化措辭；命理解讀保持傳統文化解釋屬性（例外：財富章按 T 檔階梯輸出天賦計算量級（首行免責聲明），感情流年按百分比輸出緣分概率，子女章的性別傾向判斷（必須帶「準確率約60-70%，僅供參考」標註），均屬該章標準量化格式）。
9. 核心結論欄位必須用中文引號「」括注（前端將其渲染為主題色重點，便於速讀）：旺衰定性（「身強」/「身弱」/「從勢」）、格局名（如「偏財格」，連同「格」字）、學歷檔（如「大學檔」）、管理類型（如「軍師參謀型」）、財富量級區間（如「1000萬-3000萬」）、健康薄弱系統（如「肝膽機能」「呼吸系統」，每個系統單獨括注）、子女性別傾向（「生男孩」/「生女孩」）、子女緣分（如「緣分很深」）、婚姻穩定性（如「偏中等」）。每個小節至少給出一處「」標注的結論欄位；「」專用於此類結論詞，普通措辭不要濫用。
輸出必須是單個 JSON 物件，不要 Markdown，欄位結構匹配給定模板。字串值內部禁止出現英文雙引號(")和反斜線，引用措辭一律用「」；鍵與值之間的冒號、欄位之間的逗號不可省略，不要尾逗號。`;

// 雙人合盤(繁體):同上,與簡體版規則一一對應。
export const DUAL_READING_SYSTEM_PROMPT_TRAD = `你是精通傳統子平八字與現代親密關係心理的資深合婚分析師。你的任務不是重新創作命理文章，而是根據八字引擎提供的確定性排盤數據（雙方各自命盤+跨盤關係事實），按九章23欄位蒸餾模板生成專業、具體、有針對性的《MeVerse 雙人合盤報告》——像經驗豐富的命理師當面解讀這對關係。
寫作規則：
0.【最高優先級】全文一律使用繁體中文（台灣慣用寫法與用語）——包括章節標題、欄位標籤（label）與正文，不得出現任何簡體字；命理術語用繁體慣用形（大運、流年、合盤、刑沖合害等）。排盤事實與模板裡的簡體內容僅供理解，輸出時必須轉為繁體。
1. 先下結論，再講盤面依據，最後落到現實的關係特徵、相處模式或發展方向；結論直接、有判斷力。
2. 專業術語必須翻譯成關係畫像：不解釋五行十神的定義，寫清「這意味著你們倆怎樣相處」。
3. 全程用雙方姓名稱呼（不用「你/你們/TA」），結論先行，術語後緊跟白話。
4. 雙方各自命盤的旺衰、喜忌、十神、神煞一律以排盤給定為準，不得自行改判；跨盤合沖刑害只解讀【關係事實】裡給出的條目，不得補造。
5. 內容具體，杜絕「需要多溝通」「互相包容」式空話；每條判斷寫清盤面依據和現實表現。
6. 優勢與短板並存：合盤不捧不嚇，摩擦點必須配化解處方。
7. 不寫「註定離婚」「必然分手」等宿命論斷言；未來節奏只依據提供的流年排盤，年份不編造。
8. 不用「註定」「必然」等絕對化措辭；命理解讀保持傳統文化解釋屬性。
輸出必須是單個 JSON 物件，不要 Markdown，欄位結構匹配給定模板。`;

// subject → 引擎 birth(與簡體鏈路同一轉換規則,城市庫共享)
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

// 繁體鏈路生成入口:結構/扣費/退款與簡體鏈路完全一致,僅系統指令換成繁體版。
export async function runReadingGenerationTrad(reportId: string): Promise<void> {
  const report = await getReadingReport(reportId);
  if (!report) return;
  try {
    const subjectA = report.subjectA;
    const birthA = subjectToBirth(subjectA);

    if (report.mode === "single") {
      const chart = buildBaziChart({ birthDate: birthA.birthDate, birthTime: birthA.birthTime, gender: birthA.gender === "female" ? "female" : "male", city: { id: birthA.starId, name: birthA.birthPlace, lat: birthA.lat, lon: birthA.lon, tz: birthA.tz } });
      const profile = buildBaziLifeProfile(chart);
      const facts = buildStaticReadingFacts(chart, profile);
      const content = await generateStaticReading(
        async (system, prompt) => (await generateChatText(system, [{ role: "user", content: prompt }], { provider: "gemini", temperature: 0.35, maxTokens: 30000, json: true })).content,
        facts,
        profile,
        { systemPrompt: STATIC_READING_SYSTEM_PROMPT_TRAD },
      );
      await updateReadingReport(reportId, { status: "ready", content, error: null });
      return;
    }

    const subjectB = report.subjectB;
    if (!subjectB) throw new Error("SUBJECT_B_MISSING");
    const content = await generateDualReading(subjectA, subjectB, undefined, { systemPrompt: DUAL_READING_SYSTEM_PROMPT_TRAD });
    await updateReadingReport(reportId, { status: "ready", content, error: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "READING_GENERATE_FAILED";
    console.error("Reading generation(trad) failed", reportId, message);
    await updateReadingReport(reportId, { status: "failed", error: message.slice(0, 200) });
    await refundReadingCredit(report.userId, reportId).catch(() => undefined);
  }
}
