import { after } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "../../auth/server";
import { requireReportUser } from "../reports/server";
import { generateReportText } from "../personalize/model-provider";
import { buildGeneratedTestPrompt, GENERATED_TEST_SYSTEM_PROMPT } from "./prompt";
import { parseGeneratedPayload, publicQuestions } from "./server";

const requestSchema = z.object({
  starId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100),
  reportId: z.string().uuid(),
});

type GenerationMarker = {
  generatedTestId?: string;
  generationError?: boolean;
};

async function generateAndStoreTest(starId: string, reportId: string, userId: string) {
  const supabase = createSupabaseAdminClient();
  try {
    const cleanupPromise = Promise.resolve(
      supabase
        .from("myfate_generated_tests")
        .delete()
        .lt("expires_at", new Date().toISOString()),
    );
    const { data: star, error: starError } = await supabase
      .from("celebrity_profiles")
      .select("id,mbti,birth_date,three_pillars")
      .eq("id", starId)
      .eq("published", true)
      .maybeSingle();
    if (starError) throw starError;
    if (!star) throw new Error("CELEBRITY_NOT_FOUND");

    const generation = await generateReportText(GENERATED_TEST_SYSTEM_PROMPT, buildGeneratedTestPrompt({
      mbti: star.mbti,
      birthDate: star.birth_date,
    }), {
      temperature: 0.72,
      maxTokens: 10000,
      json: true,
    });
    let payload = parseGeneratedPayload(generation.content);
    payload = {
      ...payload,
      globalBasis: payload.globalBasis ? {
        ...payload.globalBasis,
        mbti: `${star.mbti}：${payload.globalBasis.mbti}`,
        threePillars: `${star.three_pillars}：${payload.globalBasis.threePillars}`,
      } : {
        mbti: `${star.mbti}：本套题围绕该类型更可能出现的亲密关系需求、沟通节奏与压力反应设计。`,
        threePillars: `${star.three_pillars}：三柱仅作为传统关系意象的辅助观察，不构成确定预测。`,
        coreConcerns: payload.relationshipNeeds.slice(0, 5),
        summary: "整套题通过情绪回应、边界协商、冲突修复与长期磨合场景，观察测试者的自然相处方式能否被 TA 接收到。",
      },
    };

    const { error: cleanupError } = await cleanupPromise;
    if (cleanupError) console.warn("Generated test cleanup skipped", cleanupError);
    const { data, error } = await supabase.from("myfate_generated_tests").insert({
      star_id: star.id,
      payload,
      provider: generation.provider,
      model: generation.model,
    }).select("id").single();
    if (error) throw error;

    const { error: reportError } = await supabase
      .from("myfate_reports")
      .update({
        status: "initial",
        question_count: payload.questions.length,
        initial_title: "专属测试已生成",
        interpretation: { generatedTestId: data.id },
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .eq("user_id", userId)
      .eq("star_id", star.id);
    if (reportError) throw reportError;
  } catch (error) {
    console.error("Generated fate test failed", error);
    await supabase
      .from("myfate_reports")
      .update({
        initial_title: "专属测试生成失败",
        interpretation: { generationError: true },
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .eq("user_id", userId);
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
    const reportId = new URL(request.url).searchParams.get("reportId");
    if (!reportId || !z.string().uuid().safeParse(reportId).success) {
      return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    const { data: report, error: reportError } = await supabase
      .from("myfate_reports")
      .select("id,star_id,status,answers,interpretation")
      .eq("id", reportId)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (reportError) throw reportError;
    if (!report) return Response.json({ error: "REPORT_NOT_FOUND" }, { status: 404 });
    const marker = (report.interpretation ?? {}) as GenerationMarker;
    if (marker.generationError) {
      return Response.json({ status: "failed", error: "TEST_GENERATION_FAILED" }, { status: 409, headers: session.headers });
    }
    if (!marker.generatedTestId) {
      return Response.json({ status: "generating" }, { status: 202, headers: session.headers });
    }
    const { data: test, error: testError } = await supabase
      .from("myfate_generated_tests")
      .select("id,payload,expires_at")
      .eq("id", marker.generatedTestId)
      .eq("star_id", report.star_id)
      .maybeSingle();
    if (testError) throw testError;
    if (!test) return Response.json({ error: "TEST_NOT_FOUND" }, { status: 404 });
    if (new Date(test.expires_at).getTime() <= Date.now()) {
      return Response.json({ error: "TEST_EXPIRED" }, { status: 410, headers: session.headers });
    }
    const payload = parseGeneratedPayload(JSON.stringify(test.payload));
    return Response.json({
      status: "ready",
      testId: test.id,
      questions: publicQuestions(payload),
      savedAnswers: Array.isArray(report.answers) ? report.answers : [],
    }, { headers: session.headers });
  } catch (error) {
    console.error("Generated fate test lookup failed", error);
    return Response.json({ error: "TEST_LOOKUP_FAILED" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await requireReportUser(request);
  if (!session) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  if (!process.env.DEEPSEEK_API_KEY) return Response.json({ error: "MODEL_NOT_CONFIGURED" }, { status: 503 });

  const supabase = createSupabaseAdminClient();
  const { data: report, error: reportError } = await supabase
    .from("myfate_reports")
    .select("id,star_id,status,interpretation")
    .eq("id", parsed.data.reportId)
    .eq("user_id", session.user.id)
    .eq("star_id", parsed.data.starId)
    .maybeSingle();
  if (reportError) return Response.json({ error: "REPORT_LOOKUP_FAILED" }, { status: 503 });
  if (!report) return Response.json({ error: "REPORT_NOT_FOUND" }, { status: 404 });
  const marker = (report.interpretation ?? {}) as GenerationMarker;
  if (marker.generatedTestId) {
    return Response.json({ reportId: report.id, status: "ready" }, { headers: session.headers });
  }

  const { error: resetError } = await supabase
    .from("myfate_reports")
    .update({
      status: "generating",
      initial_title: "题目生成中",
      interpretation: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", report.id)
    .eq("user_id", session.user.id);
  if (resetError) return Response.json({ error: "REPORT_UPDATE_FAILED" }, { status: 503 });

  after(() => generateAndStoreTest(report.star_id, report.id, session.user.id));
  return Response.json({ reportId: report.id, status: "generating" }, { status: 202, headers: session.headers });
}
