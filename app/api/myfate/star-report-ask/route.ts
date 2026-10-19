import { z } from "zod";
import { buildBaziChart } from "../../../myfate-bazi-engine";
import { buildStarBaziReport, formatStarBaziReport } from "../../../myfate-star-bazi-report";
import { formatAstrologyReport, getAstrologyReport } from "../../../myfate-astrology-engine";
import { formatConsultOverrideDigest, getConsultOverride } from "../../../myfate-consult-override-store";
import { getCelebrityVedicBirth, getPublishedStar } from "../../../myfate-stars-server";
import { getDualReport } from "../../../myfate-dual-server";
import { getReadingReport } from "../../../myfate-reading-server";
import { staticReadingSchema } from "../../../myfate-static-reading";
import { dualReportSchema } from "../../../myfate-dual-generator";
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
const typeSchema = z.enum(["bazi", "astrology", "dual", "reading-single", "reading-dual"]);
const requestSchema = z.object({
  starId: starIdSchema,
  reportType: typeSchema.default("bazi"),
  question: z.string().trim().min(1).max(500),
  retryOf: z.number().int().positive().optional(),
});

// 会话键归一:reading 报告以 "reading:{id}" 作 star_id 并复用现有 report_type 枚举
// (ask_conversations 表有 report_type CHECK 约束且无 DDL 通道,前缀方案保持隔离不变)
function conversationKey(starId: string, reportType: "bazi" | "astrology" | "dual" | "reading-single" | "reading-dual") {
  if (reportType === "reading-single") return { starId: `reading:${starId}`, reportType: "bazi" as const };
  if (reportType === "reading-dual") return { starId: `reading:${starId}`, reportType: "dual" as const };
  return { starId, reportType };
}

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

async function buildDigest(starId: string, reportType: "bazi" | "astrology" | "dual" | "reading-single" | "reading-dual", userId: string) {
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

  if (reportType === "dual") {
    // 双星追问:starId 即报告 id,上下文来自已生成的合盘报告
    const report = await getDualReport(starId);
    if (!report || report.status !== "ready") throw new Error("DUAL_REPORT_NOT_READY");
    const [starA, starB] = await Promise.all([getPublishedStar(report.starA), getPublishedStar(report.starB)]);
    const nameA = starA?.name ?? report.starA;
    const nameB = starB?.name ?? report.starB;
    const content = report.content as { summary?: string; sections?: Record<string, { title?: string; paragraphs?: string[] }>; basis?: Array<{ term?: string; plain?: string }>; scores?: Record<string, number>; future_rhythm?: { supportive_periods?: Array<{ start_year: number; end_year: number; label: string; detail: string }>; pressure_periods?: Array<{ start_year: number; end_year: number; label: string; detail: string }> }; available_time_range?: { start_year: number; end_year: number } | null } | null;
    const lines: string[] = [
      `这是「${nameA} × ${nameB}」双人合盘报告。关系画像:${report.summary}`,
    ];
    if (content?.scores) lines.push("评分(相对趋势):" + Object.entries(content.scores).map(([k, v]) => `${k}=${v}`).join(" "));
    for (const section of Object.values(content?.sections ?? {})) {
      if (section?.title && section.paragraphs?.length) lines.push(`【${section.title}】` + section.paragraphs.join(" "));
    }
    const rhythm = content?.future_rhythm;
    if (rhythm) {
      const formatPeriod = (period: { start_year: number; end_year: number; label: string; detail: string }) => `${period.start_year}${period.start_year === period.end_year ? "" : `-${period.end_year}`}年 ${period.label}:${period.detail}`;
      const range = content?.available_time_range;
      const parts = [
        ...(rhythm.supportive_periods ?? []).map((period) => `[支持]${formatPeriod(period)}`),
        ...(rhythm.pressure_periods ?? []).map((period) => `[压力]${formatPeriod(period)}`),
      ];
      if (parts.length) lines.push(`【未来关系节奏${range ? `(可分析区间 ${range.start_year}-${range.end_year} 年,不得谈及区间外年份)` : ""}】` + parts.join(";"));
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
    const key = conversationKey(starId, reportType);
    const conversation = await getOrCreateConversation(session.user.id, key.starId, key.reportType);
    conversationId = conversation.id;
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

    const generation = await generateChatText(systemPrompt(name, digest, conversation.summary), messages, {
      temperature: 0.8,
      maxTokens: 1200,
    });
    // 模型偶发输出 markdown 星号(加粗/斜体/列表),统一清洗后再落库与返回
    const answer = generation.content.replaceAll("*", "");

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
            { temperature: 0.3, maxTokens: 500 },
          );
          return result.content;
        } catch {
          return previous;
        }
      }).catch(() => undefined);
    }

    return Response.json({ answer, asksRemaining, userMessageId, conversationId });
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
