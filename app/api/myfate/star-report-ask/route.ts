import { z } from "zod";
import { buildBaziChart } from "../../../myfate-bazi-engine";
import { buildStarBaziReport, formatStarBaziReport } from "../../../myfate-star-bazi-report";
import { formatAstrologyReport, getAstrologyReport } from "../../../myfate-astrology-engine";
import { getCelebrityVedicBirth, getPublishedStar } from "../../../myfate-stars-server";
import { getDualReport } from "../../../myfate-dual-server";
import {
  appendExchange,
  clearConversation,
  completeRetry,
  contextMessages,
  getOrCreateConversation,
  getMessageById,
  listMessages,
  saveFailedQuestion,
  summarizeIfNeeded,
  type AskRole,
} from "../../../myfate-ask-store";
import { createSupabaseAdminClient } from "../../auth/server";
import { generateChatText } from "../personalize/model-provider";
import { requireReportUser } from "../reports/server";
import { isUpgradesEnabled } from "../../../myfate-settings";

export const maxDuration = 60;

const starIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100);
const typeSchema = z.enum(["bazi", "astrology", "dual"]);
const requestSchema = z.object({
  starId: starIdSchema,
  reportType: typeSchema.default("bazi"),
  question: z.string().trim().min(1).max(500),
  retryOf: z.number().int().positive().optional(),
});

function systemPrompt(starName: string, reportDigest: string, summary: string) {
  const summaryBlock = summary ? `\n【较早对话摘要】\n${summary}\n` : "";
  return [
    `你是 Myfate 的资深解读师。用户刚刚看完明星「${starName}」的分析报告,现在基于这份报告向你追问。`,
    "",
    "【当前报告全文——唯一事实依据】",
    reportDigest,
    summaryBlock,
    "回答规则:",
    "1. 一切回答以这份报告为准;禁止自行重新推算,禁止给出报告之外的数字或结论。",
    "2. 报告已覆盖的问题,先按报告口径直接回答,再通俗展开;报告未覆盖的,基于报告内的数据延伸,并说明是延伸解读。",
    "3. 白话为主,语气温暖有分寸;结论用「倾向/可能/建议」的口吻,不做宿命论断言。",
    "4. 每次回答 150-300 字,可分点,可少量使用 ✦ ♡ 等符号。",
    "5. 用户问到现实八卦、行程等报告之外的事时,温和地把话题拉回报告视角。",
    "6. 不做医疗诊断、法律与投资建议;涉及时辰精度细节时,提醒「仅供参考」。",
    "7. 结合「较早对话摘要」与最近对话保持连贯,但不得引用已被报告修正的旧说法。",
  ].join("\n");
}

async function buildDigest(starId: string, reportType: "bazi" | "astrology" | "dual") {
  if (reportType === "dual") {
    // 双星追问:starId 即报告 id,上下文来自已生成的合盘报告
    const report = await getDualReport(starId);
    if (!report || report.status !== "ready") throw new Error("DUAL_REPORT_NOT_READY");
    const [starA, starB] = await Promise.all([getPublishedStar(report.starA), getPublishedStar(report.starB)]);
    const nameA = starA?.name ?? report.starA;
    const nameB = starB?.name ?? report.starB;
    const content = report.content as { summary?: string; sections?: Record<string, { title?: string; paragraphs?: string[] }>; basis?: Array<{ term?: string; plain?: string }>; scores?: Record<string, number> } | null;
    const lines: string[] = [
      `这是「${nameA} × ${nameB}」双星合盘报告。关系画像:${report.summary}`,
    ];
    if (content?.scores) lines.push("评分(相对趋势):" + Object.entries(content.scores).map(([k, v]) => `${k}=${v}`).join(" "));
    for (const section of Object.values(content?.sections ?? {})) {
      if (section?.title && section.paragraphs?.length) lines.push(`【${section.title}】` + section.paragraphs.join(" "));
    }
    if (content?.basis?.length) lines.push("命理依据:" + content.basis.map((item) => `${item.term}(${item.plain})`).join(";"));
    return { name: `${nameA} × ${nameB}`, digest: lines.join("\n") };
  }

  const star = await getPublishedStar(starId);
  if (!star) throw new Error("STAR_NOT_FOUND");
  const birth = await getCelebrityVedicBirth(starId);
  if (reportType === "astrology") {
    const report = await getAstrologyReport({
      name: star.name,
      birthDate: birth?.birthDate ?? star.birthDate,
      birthTime: birth?.birthTime,
      lat: birth?.lat ?? 37.57,
      lon: birth?.lon ?? 126.98,
      tz: birth?.tz ?? "Asia/Seoul",
      timeKnown: Boolean(birth?.birthTime),
    });
    return { name: star.name, digest: formatAstrologyReport(report) };
  }
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
  return { name: star.name, digest: formatStarBaziReport(buildStarBaziReport(chart)) };
}

export async function GET(request: Request) {
  const session = await requireReportUser(request);
  if (!session) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const url = new URL(request.url);
  const parsedStar = starIdSchema.safeParse(url.searchParams.get("starId") ?? "");
  const parsedType = typeSchema.safeParse(url.searchParams.get("type") ?? "bazi");
  if (!parsedStar.success || !parsedType.success) return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  const beforeRaw = Number(url.searchParams.get("before") ?? "");
  const before = Number.isInteger(beforeRaw) && beforeRaw > 0 ? beforeRaw : undefined;

  try {
    const conversation = await getOrCreateConversation(session.user.id, parsedStar.data, parsedType.data);
    const { messages, hasMore } = await listMessages(conversation.id, before);
    return Response.json({ conversationId: conversation.id, messageCount: conversation.messageCount, messages, hasMore });
  } catch (error) {
    console.error("ask history failed", error);
    return Response.json({ error: "HISTORY_UNAVAILABLE" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireReportUser(request);
  if (!session) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const url = new URL(request.url);
  const parsedStar = starIdSchema.safeParse(url.searchParams.get("starId") ?? "");
  const parsedType = typeSchema.safeParse(url.searchParams.get("type") ?? "bazi");
  if (!parsedStar.success || !parsedType.success) return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  await clearConversation(session.user.id, parsedStar.data, parsedType.data);
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const session = await requireReportUser(request);
  if (!session) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // 追问额度 = 累计解读次数 × 10 − 已用追问,不足则 402 引导购买;免费模式跳过计量
  const metered = await isUpgradesEnabled();
  const admin = createSupabaseAdminClient();
  if (metered) {
    const { data: askQuota } = await admin.rpc("remaining_ask_credits", { p_user_id: session.user.id });
    if (typeof askQuota !== "number" || askQuota <= 0) {
      return Response.json({ error: "CREDITS_REQUIRED" }, { status: 402 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  const { starId, reportType, question, retryOf } = parsed.data;

  let conversationId = "";
  try {
    const conversation = await getOrCreateConversation(session.user.id, starId, reportType);
    conversationId = conversation.id;
    const { name, digest } = await buildDigest(starId, reportType);

    // 重试:复用原用户消息内容,不新建问题
    let finalQuestion = question;
    if (retryOf) {
      const original = await getMessageById(retryOf, session.user.id);
      if (!original || original.conversationId !== conversation.id || original.status !== "failed") {
        return Response.json({ error: "RETRY_NOT_ALLOWED" }, { status: 400 });
      }
      finalQuestion = original.content;
    }

    const history = await contextMessages(conversation);
    const messages: Array<{ role: AskRole; content: string }> = [...history, { role: "user", content: finalQuestion }];

    const generation = await generateChatText(systemPrompt(name, digest, conversation.summary), messages, {
      temperature: 0.8,
      maxTokens: 1200,
    });

    // 成功后落库并扣 1 次追问(免费模式不扣)
    let asksRemaining: number | null = null;
    if (metered) {
      try {
        const consumed = await admin.rpc("consume_ask_credit", { p_user_id: session.user.id });
        if (typeof consumed.data === "number") asksRemaining = consumed.data;
      } catch (consumeError) {
        console.error("consume_ask_credit failed", consumeError);
      }
    }

    let userMessageId: number;
    if (retryOf) {
      await completeRetry(conversation.id, retryOf, generation.content);
      userMessageId = retryOf;
    } else {
      await appendExchange(conversation.id, session.user.id, finalQuestion, generation.content);
      userMessageId = 0;
      // 消息增多后滚动维护摘要,保证上下文不随历史无限膨胀
      void summarizeIfNeeded({ ...conversation, messageCount: conversation.messageCount + 2 }, async (older, previous) => {
        try {
          const result = await generateChatText(
            "你是对话摘要器。把给定的命理追问对话压缩成 200 字以内的要点摘要,保留用户关注的问题与已给出的结论,不要寒暄。",
            [{ role: "user", content: (previous ? `已有摘要:${previous}\n` : "") + older.map((item) => `${item.role === "user" ? "用户" : "AI"}:${item.content}`).join("\n") }],
            { temperature: 0.3, maxTokens: 500 },
          );
          return result.content;
        } catch {
          return previous;
        }
      }).catch(() => undefined);
    }

    return Response.json({ answer: generation.content, asksRemaining, userMessageId, conversationId });
  } catch (error) {
    // 生成失败:保留用户问题为 failed 供前端重试(未扣费,重试成功才扣)
    if (!retryOf && question) {
      try {
        const failedId = await saveFailedQuestion(conversationId || (await getOrCreateConversation(session.user.id, starId, reportType)).id, session.user.id, question);
        return Response.json({ error: "AI_UNAVAILABLE", messageId: failedId }, { status: 503 });
      } catch (saveError) {
        console.error("save failed question error", saveError);
      }
    }
    console.error("star-report-ask failed", error);
    return Response.json({ error: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
