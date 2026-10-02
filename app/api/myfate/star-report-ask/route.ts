import { z } from "zod";
import { getAstrologyReport } from "../../../myfate-astrology-engine";
import { buildBaziChart } from "../../../myfate-bazi-engine";
import { buildBaziLifeProfile } from "../../../myfate-bazi-profile";
import { buildStarBaziReport } from "../../../myfate-star-bazi-report";
import { getCelebrityVedicBirth, getPublishedStar } from "../../../myfate-stars-server";
import { createSupabaseAdminClient } from "../../auth/server";
import { isUpgradesEnabled } from "../../../myfate-settings";
import { generateChatText, type ChatMessage } from "../personalize/model-provider";
import { requireReportUser } from "../reports/server";

export const maxDuration = 60;

const requestSchema = z.object({
  starId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(600) })).max(12).default([]),
  question: z.string().trim().min(1).max(500),
  reportType: z.enum(["bazi", "astrology"]).default("bazi"),
});

function systemPrompt(starName: string, reportJson: string, reportType: "bazi" | "astrology") {
  const astrology = reportType === "astrology";
  return [
    astrology
      ? `你是 Myfate 的资深西洋占星师,正在与用户一对一解读明星「${starName}」的本命星盘。`
      : `你是 Myfate 的资深八字生辰画像解读师,正在与用户一对一解读明星「${starName}」的完整命盘。`,
    astrology ? "你手里有确定性星历引擎计算出的行星、宫位、相位、格局与报告结构。" : "你手里有 TA 的八字排盘、完整生辰画像与感情分析报告。",
    "",
    "【报告数据】",
    reportJson,
    "",
    "回答规则:",
    astrology
      ? "1. 只基于给定星盘数据作答;禁止重新计算或编造星位、宫位和相位,不要混入八字判断。"
      : "1. 只基于给定八字数据作答;禁止重新排盘、编造干支,不要混入西洋占星判断。",
    "2. 白话为主,先说结论再指出对应星位证据;使用「倾向/可能/建议」,不做宿命论断言。",
    "3. 每次回答 150-300 字,可以分点,不要使用 markdown 标题。",
    "4. 不谈现实八卦和盘面外事实;不做医疗诊断、法律或投资建议。",
    astrology
      ? "5. 如果出生时间未确认,不得判断上升、天顶和宫位,并明确提示精度边界。"
      : "5. 涉及时柱和具体年份时,若时辰为近似值要明确提示精度边界。",
    "6. 回答结尾可以自然追问一句,帮助用户继续探索。",
  ].join("\n");
}

export async function POST(request: Request) {
  const session = await requireReportUser(request);
  if (!session) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const metered = await isUpgradesEnabled();
  const admin = createSupabaseAdminClient();
  if (metered) {
    const { data: askQuota } = await admin.rpc("remaining_ask_credits", { p_user_id: session.user.id });
    if (typeof askQuota !== "number" || askQuota <= 0) return Response.json({ error: "CREDITS_REQUIRED" }, { status: 402 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  const { starId, history, question, reportType } = parsed.data;
  const star = await getPublishedStar(starId);
  if (!star) return Response.json({ error: "STAR_NOT_FOUND" }, { status: 404 });
  const birth = await getCelebrityVedicBirth(starId);
  const messages: ChatMessage[] = [...history.slice(-12), { role: "user", content: question }];

  try {
    const context = reportType === "astrology"
      ? await getAstrologyReport({
        name: star.name,
        birthDate: birth?.birthDate ?? star.birthDate,
        birthTime: birth?.birthTime,
        lat: birth?.lat ?? 37.57,
        lon: birth?.lon ?? 126.98,
        tz: birth?.tz ?? "Asia/Seoul",
        timeKnown: Boolean(birth?.birthTime),
      })
      : (() => {
        const chart = buildBaziChart({
          birthDate: birth?.birthDate ?? star.birthDate,
          birthTime: birth?.birthTime ?? "12:00",
          gender: birth?.gender === "female" ? "female" : "male",
          city: { id: starId, name: birth?.birthPlace || "首尔", lat: birth?.lat ?? 37.57, lon: birth?.lon ?? 126.98, tz: birth?.tz ?? "Asia/Seoul" },
        });
        return { report: buildStarBaziReport(chart), profile: buildBaziLifeProfile(chart) };
      })();

    const generation = await generateChatText(systemPrompt(star.name, JSON.stringify(context), reportType), messages, { temperature: 0.8, maxTokens: 1200 });
    let asksRemaining: number | null = null;
    if (metered) {
      try {
        const consumed = await admin.rpc("consume_ask_credit", { p_user_id: session.user.id });
        if (typeof consumed.data === "number") asksRemaining = consumed.data;
      } catch (consumeError) {
        console.error("consume_ask_credit failed", consumeError);
      }
    }
    return Response.json({ answer: generation.content, asksRemaining });
  } catch (error) {
    console.error("star-report-ask failed", error);
    return Response.json({ error: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
