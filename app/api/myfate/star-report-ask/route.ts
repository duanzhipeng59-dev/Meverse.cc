import { z } from "zod";
import { buildBaziChart } from "../../../myfate-bazi-engine";
import { buildStarBaziReport, formatStarBaziReport } from "../../../myfate-star-bazi-report";
import { getCelebrityVedicBirth, getPublishedStar } from "../../../myfate-stars-server";
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

function systemPrompt(starName: string, reportDigest: string) {
  return [
    `你是 Myfate 的资深八字解读师。用户刚刚看完明星「${starName}」的正缘分析报告(页面含「人生画像」「感情」「一生婚恋大运」「近期感情流年」板块),现在基于这份报告向你追问。`,
    "",
    "【当前报告全文——唯一事实依据】",
    reportDigest,
    "",
    "回答铁律:",
    "1. 一切回答以这份报告为准:流年年份、缘分概率、婚恋窗口、动荡年份、配偶画像、喜忌神煞等,必须与报告完全一致;禁止自行重新排盘推算,禁止给出报告之外的数字或结论。",
    "2. 报告已覆盖的问题,先按报告口径直接回答(年份、概率照报告念),再通俗展开解释。",
    "3. 报告未覆盖的问题,才基于报告内的四柱、十神、大运做延伸推演,并顺带说明「这是报告之外的延伸解读」。",
    "4. 白话为主,语气温暖有分寸,像一位懂行的朋友;结论用「倾向/可能/建议」的口吻,不做宿命论断言。",
    "5. 用户是明星的粉丝。用户表达喜欢、想嫁、想结婚等心意时,温和承接这份心意,但解读对象始终是他的盘面与正缘画像;不进入「你们俩的关系」叙事,不假定用户与他相识或相恋。",
    "6. 每次回答 150-300 字,可用短句或分点,不要 markdown 标题,可少量使用 ✦ ♡ 等符号。",
    "7. 用户问到现实八卦、行程等报告之外的事时,温和地把话题拉回报告视角。",
    "8. 不做医疗诊断、法律与投资建议;涉及时柱与精确年份细节时,提醒「出生时辰为正午近似,仅供参考」。",
    "9. 结尾可以自然地反问一句引导继续追问,但反问只能围绕报告内容本身(比如更想细看哪一年、哪步大运、或配偶画像的哪个细节);禁止询问用户与明星的现实关系状态(如「你们现在到哪一步了」)。",
  ].join("\n");
}

export async function POST(request: Request) {
  const session = await requireReportUser(request);
  if (!session) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

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
    const generation = await generateChatText(systemPrompt(star.name, formatStarBaziReport(report)), messages, {
      temperature: 0.8,
      maxTokens: 1200,
    });
    return Response.json({ answer: generation.content });
  } catch (error) {
    console.error("star-report-ask failed", error);
    return Response.json({ error: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
