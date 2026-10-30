import { z } from "zod";
import { buildBaziChart } from "../../../myfate-bazi-engine";
import { buildStarBaziReport, formatStarBaziReport } from "../../../myfate-star-bazi-report";
import { formatConsultOverrideDigest, getConsultOverride } from "../../../myfate-consult-override-store";
import { getCelebrityVedicBirth, getPublishedStar } from "../../../myfate-stars-server";
import { getReadingReport } from "../../../myfate-reading-server";
import { staticReadingSchema } from "../../../myfate-static-reading";
import { dualReadingSchema } from "../../../myfate-dual-reading";
import { dualReportSchema } from "../../../myfate-dual-legacy";
import {
  appendExchange,
  clearConversation,
  completeRetry,
  consumeAskBank,
  contextMessages,
  getAskBank,
  getOrCreateConversation,
  getMessageById,
  listMessages,
  saveFailedQuestion,
  summarizeIfNeeded,
  type AskRole,
} from "../../../myfate-ask-store";
import { generateChatText } from "../personalize/model-provider";
import { requireReportUser } from "../reports/server";

export const maxDuration = 60;

// 追问计费:无免费额度,每问 1 条扣 1 次追问余额(套餐/追问包充值)

const starIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100);
const typeSchema = z.enum(["bazi", "reading-single", "reading-dual"]);
const requestSchema = z.object({
  starId: starIdSchema,
  reportType: typeSchema.default("bazi"),
  question: z.string().trim().min(1).max(500),
  retryOf: z.number().int().positive().optional(),
});

// 会话键归一:reading 报告以 "reading:{id}" 作 star_id 并复用现有 report_type 枚举
// (ask_conversations 表有 report_type CHECK 约束且无 DDL 通道,前缀方案保持隔离不变)
type AskReportType = "bazi" | "reading-single" | "reading-dual";
type StoredReportType = "bazi" | "dual";
function conversationKey(starId: string, reportType: AskReportType): { starId: string; reportType: StoredReportType } {
  if (reportType === "reading-single") return { starId: `reading:${starId}`, reportType: "bazi" };
  if (reportType === "reading-dual") return { starId: `reading:${starId}`, reportType: "dual" };
  return { starId, reportType };
}

function systemPrompt(starName: string, reportDigest: string, summary: string) {
  const summaryBlock = summary ? `\n【较早对话摘要】\n${summary}\n` : "";
  return [
    `你是 MeVerse 的资深解读师。用户刚刚看完明星「${starName}」的分析报告,现在基于这份报告向你追问。`,
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

async function buildDigest(starId: string, reportType: AskReportType, userId: string) {
  if (reportType === "reading-single" || reportType === "reading-dual") {
    // 自填/记录解读追问:starId 即 reading 报告 id,归属校验后按报告类型压缩全文
    const report = await getReadingReport(starId);
    if (!report || report.userId !== userId) throw new Error("READING_REPORT_NOT_FOUND");
    if (report.status !== "ready" || !report.content) throw new Error("READING_REPORT_NOT_READY");
    if (reportType === "reading-single") {
      const parsed = staticReadingSchema.safeParse(report.content);
      if (!parsed.success) throw new Error("READING_REPORT_NOT_READY");
      const single = parsed.data;
      const lines = [`这是「${report.subjectA.name}」的单人八字静态命局报告。`];
      for (const section of Object.values(single.sections)) {
        lines.push(`【${section.title}】${section.summary} ${section.insights.map((item) => `${item.label}:${item.content}`).join("；")} 建议:${section.advice.join("；")}`);
      }
      return { name: report.subjectA.name, digest: lines.join("\n") };
    }
    // 新契约:蒸馏管线产出的九章合盘报告(dual-reading-v1)优先;旧结构回退 legacy 解析
    const dualReading = dualReadingSchema.safeParse(report.content);
    if (dualReading.success) {
      const subjectB0 = report.subjectB?.name ?? "对方";
      const readingLines = [`这是「${report.subjectA.name} × ${subjectB0}」双人合盘报告。`];
      for (const section of Object.values(dualReading.data.sections)) {
        readingLines.push(`【${section.title}】${section.insights.map((item) => `${item.label}:${item.content}`).join("；")}`);
      }
      return { name: `${report.subjectA.name} × ${subjectB0}`, digest: readingLines.join("\n") };
    }
    const parsed = dualReportSchema.safeParse(report.content);
    if (!parsed.success) throw new Error("READING_REPORT_NOT_READY");
    const dual = parsed.data;
    const subjectB = report.subjectB?.name ?? "对方";
    const lines = [`这是「${report.subjectA.name} × ${subjectB}」双人合盘报告。关系画像:${dual.summary}`];
    for (const section of Object.values(dual.sections)) {
      lines.push(`【${section.headline}】${section.aToB} ${section.bToA} 相处表现:${section.behavior} 风险:${section.risk} 建议:${section.advice}`);
    }
    const rhythm = dual.future_rhythm;
    if (rhythm && (rhythm.supportive_periods.length || rhythm.pressure_periods.length)) {
      const formatPeriod = (period: { start_year: number; end_year: number; label: string; detail: string }) => `${period.start_year}${period.start_year === period.end_year ? "" : `-${period.end_year}`}年 ${period.label}:${period.detail}`;
      const range = dual.available_time_range;
      lines.push(`【未来关系节奏${range ? `(可分析区间 ${range.start_year}-${range.end_year} 年)` : ""}】` + [
        ...rhythm.supportive_periods.map((period) => `[支持]${formatPeriod(period)}`),
        ...rhythm.pressure_periods.map((period) => `[压力]${formatPeriod(period)}`),
      ].join(";"));
    }
    return { name: `${report.subjectA.name} × ${subjectB}`, digest: lines.join("\n") };
  }

  const star = await getPublishedStar(starId);
  if (!star) throw new Error("STAR_NOT_FOUND");
  const birth = await getCelebrityVedicBirth(starId);
  // 生辰报告摘要优先用上传内容;尚未上传的明星回退引擎实时摘要
  const override = await getConsultOverride(starId);
  if (override) return { name: star.name, digest: formatConsultOverrideDigest(override) };
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
    const key = conversationKey(parsedStar.data, parsedType.data);
    const conversation = await getOrCreateConversation(session.user.id, key.starId, key.reportType);
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
  const key = conversationKey(parsedStar.data, parsedType.data);
  await clearConversation(session.user.id, key.starId, key.reportType);
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const session = await requireReportUser(request);
  if (!session) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "BAD_REQUEST" }, { status: 400 });
  const { starId, reportType, question, retryOf } = parsed.data;

  let conversationId = "";
  try {
    const key = conversationKey(starId, reportType);
    const conversation = await getOrCreateConversation(session.user.id, key.starId, key.reportType);
    conversationId = conversation.id;
    // 追问余额不足直接 402(重试失败问题也要求有余额——重试成功同样消耗一次)
    const askBank = await getAskBank(session.user.id);
    if (askBank < 1) {
      return Response.json({ error: "ASK_CREDITS_REQUIRED" }, { status: 402 });
    }
    const { name, digest } = await buildDigest(starId, reportType, session.user.id);

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

    // 追问固定用 Gemini,与个人解读报告的生成管线同源
    const generation = await generateChatText(systemPrompt(name, digest, conversation.summary), messages, {
      provider: "gemini",
      temperature: 0.8,
      maxTokens: 1200,
    });
    // 模型偶发输出 markdown 星号(加粗/斜体/列表),统一清洗后再落库与返回
    const answer = generation.content.replaceAll("*", "");

    let userMessageId: number;
    if (retryOf) {
      await completeRetry(conversation.id, retryOf, answer);
      userMessageId = retryOf;
    } else {
      await appendExchange(conversation.id, session.user.id, finalQuestion, answer);
      userMessageId = 0;
      // 消息增多后滚动维护摘要,保证上下文不随历史无限膨胀
      void summarizeIfNeeded({ ...conversation, messageCount: conversation.messageCount + 2 }, async (older, previous) => {
        try {
          const result = await generateChatText(
            "你是对话摘要器。把给定的命理追问对话压缩成 200 字以内的要点摘要,保留用户关注的问题与已给出的结论,不要寒暄。",
            [{ role: "user", content: (previous ? `已有摘要:${previous}\n` : "") + older.map((item) => `${item.role === "user" ? "用户" : "AI"}:${item.content}`).join("\n") }],
            { provider: "gemini", temperature: 0.3, maxTokens: 500 },
          );
          return result.content;
        } catch {
          return previous;
        }
      }).catch(() => undefined);
    }

    // 成功回答后扣 1 次追问余额;扣费失败不影响回答返回(只记日志)
    let askRemaining: number | null = null;
    try {
      askRemaining = await consumeAskBank(session.user.id);
    } catch (consumeError) {
      console.error("consume_ask_credit_bank failed", consumeError);
    }

    return Response.json({ answer, userMessageId, conversationId, askRemaining });
  } catch (error) {
    // 生成失败:保留用户问题为 failed 供前端重试(未扣费,重试成功才扣)
    if (!retryOf && question) {
      try {
        const fallbackKey = conversationKey(starId, reportType);
        const failedId = await saveFailedQuestion(conversationId || (await getOrCreateConversation(session.user.id, fallbackKey.starId, fallbackKey.reportType)).id, session.user.id, question);
        return Response.json({ error: "AI_UNAVAILABLE", messageId: failedId }, { status: 503 });
      } catch (saveError) {
        console.error("save failed question error", saveError);
      }
    }
    console.error("star-report-ask failed", error);
    return Response.json({ error: "AI_UNAVAILABLE" }, { status: 503 });
  }
}
