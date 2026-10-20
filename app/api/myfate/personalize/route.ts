import { z } from "zod";
import { getSessionUser } from "../../auth/server";
import { getCelebrityReportPrompt } from "../../../myfate-stars-server";
import { generateReportText } from "./model-provider";
import {
  buildMyfateReportPrompt,
  buildRelationshipProfileReportPrompt,
  MYFATE_PROFILE_REPORT_SYSTEM_PROMPT,
  MYFATE_REPORT_SYSTEM_PROMPT,
} from "./report-prompt";

const answerSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(500)).min(1).max(12).optional(),
  answer: z.string().min(1).max(500),
});

const requestSchema = z.discriminatedUnion("reportType", [
  z.object({
    action: z.literal("report"),
    reportType: z.literal("celebrity-match"),
    starId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
    answers: z.array(answerSchema).min(1).max(64),
  }),
  z.object({
    action: z.literal("report"),
    reportType: z.literal("relationship-profile"),
    answers: z.array(answerSchema).min(1).max(64),
  }),
]);

export async function POST(request: Request) {
  // 生成报告消耗模型调用费用,必须登录(与其余 AI 接口一致)
  const { user } = await getSessionUser(request);
  if (!user) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });

  if (!process.env.DEEPSEEK_API_KEY) {
    return Response.json({ error: "MODEL_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    if (parsed.data.reportType === "relationship-profile") {
      const prompt = buildRelationshipProfileReportPrompt(parsed.data.answers);
      const generation = await generateReportText(MYFATE_PROFILE_REPORT_SYSTEM_PROMPT, prompt);
      return Response.json({ report: generation.content, source: generation.provider, model: generation.model });
    }

    const idolPrompt = await getCelebrityReportPrompt(parsed.data.starId);
    if (!idolPrompt) return Response.json({ error: "CELEBRITY_NOT_FOUND" }, { status: 404 });
    const prompt = buildMyfateReportPrompt({
      idolPrompt,
      answers: parsed.data.answers,
    });
    const generation = await generateReportText(MYFATE_REPORT_SYSTEM_PROMPT, prompt);
    return Response.json({
      report: generation.content,
      source: generation.provider,
      model: generation.model,
    });
  } catch (error) {
    console.error("MeVerse report generation failed", error);
    return Response.json({ error: "MODEL_GENERATION_FAILED" }, { status: 502 });
  }
}
