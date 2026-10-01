import { z } from "zod";
import { buildBaziChart } from "../../../myfate-bazi-engine";
import { buildStarBaziReport } from "../../../myfate-star-bazi-report";
import { getCelebrityVedicBirth, getPublishedStar } from "../../../myfate-stars-server";
import { createSupabaseAdminClient } from "../../auth/server";
import { generateChatText, type ChatMessage } from "../personalize/model-provider";
import { requireReportUser } from "../reports/server";

export const maxDuration = 60;

const requestSchema = z.object({
  starId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(600),
  })).max(12).default([]),
  question: z.string().trim().min(1).max(500),
});

function systemPrompt(starName: string, reportJson: string) {
  return [
    `你是 Myfate 的资深八字解读师,正在与粉丝用户一对一对话,话题对象是明星「${starName}」的感情与正缘。`,
    `你手里有他的八字排盘与已生成的正缘分析报告(见下方数据)。`,
    "",
    "【报告数据】",
    reportJson,
    "",
    "回答规则:",
    "1. 只基于给定的排盘与报告数据作答;禁止重新排盘、编造干支,也不谈论现实八卦、行程等盘面之外的事实。",
    "2. 白话为主,语气温暖有分寸,像一位懂行的朋友;结论用「倾向/可能/建议」的口吻,不做宿命论断言。",
    "3. 每次回答 150-300 字,可用短句或分点,不要 markdown 标题,可少量使用 ✦ ♡ 等符号。",
    "4. 用户问到盘面之外的现实问题时,温和地把话题拉回八字解读的视角。",
    "5. 不做医疗诊断、法律与投资建议。",
    "6. 涉及时柱、大运精确年份等细节时,提醒「出生时辰为正午近似,仅供参考」。",
    "7. 回答结尾可以自然地反问一句,引导用户继续追问。",
  ].join("\n");
}

export async function POST(request: Request) {
  const session = await requireReportUser(request);
  if (!session) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // 追问额度 = 累计解读次数 × 10 − 已用追问,不足则 402 引导购买
  const admin = createSupabaseAdminClient();
  const { data: askQuota } = await admin
    .rpc("remaining_ask_credits", { p_user_id: session.user.id });
  if (typeof askQuota !== "number" || askQuota <= 0) {
    return Response.json({ error: "CREDITS_REQUIRED" }, { status: 402 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  const { starId, history, question } = parsed.data;

  const star = await getPublishedStar(starId);
  if (!star) return Response.json({ error: "STAR_NOT_FOUND" }, { status: 404 });
  const birth = await getCelebrityVedicBirth(starId);

  const chart = buildBaziChart({
    birthDate: birth?.birthDate ?? star.birthDate,
    birthTime: birth?.birthTime ?? "12:00",
    gender: birth?.gender === "female" ? "female" : "male",
    city: {
      id: starId,
      name: birth?.birthPlace || "首尔",
      lat: birth?.lat ?? 37.57,
      lon: birth?.lon ?? 126.98,
      tz: birth?.tz ?? "Asia/Seoul",
    },
  });
  const report = buildStarBaziReport(chart);

  const messages: ChatMessage[] = [...history.slice(-12), { role: "user", content: question }];
  try {
    const generation = await generateChatText(systemPrompt(star.name, JSON.stringify(report)), messages, {
      temperature: 0.8,
      maxTokens: 1200,
    });
    // 生成成功后扣 1 次追问(并发竞态下的少量超发可接受)
    let asksRemaining: number | null = null;
    try {
      const consumed = await admin.rpc("consume_ask_credit", { p_user_id: session.user.id });
      if (typeof consumed.data === "number") asksRemaining = consumed.data;
    } catch (consumeError) {
      console.error("consume_ask_credit failed", consumeError);
    }
    return Response.json({ answer: generation.content, asksRemaining });
  } catch (error) {
    console.error("star-report-ask failed", error);
    return Response.json({ error: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
