import { z } from "zod";
import { createSupabaseAdminClient } from "../../auth/server";
import { getPublishedStar } from "../../../myfate-stars-server";
import { requireReportUser } from "../reports/server";
import { generateReportText } from "../personalize/model-provider";
import { buildGeneratedTestPrompt, GENERATED_TEST_SYSTEM_PROMPT } from "./prompt";
import { parseGeneratedPayload, publicQuestions } from "./server";

const requestSchema = z.object({
  starId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(100),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const session = await requireReportUser(request);
  if (!session) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
  if (!process.env.DEEPSEEK_API_KEY) return Response.json({ error: "MODEL_NOT_CONFIGURED" }, { status: 503 });

  try {
    const star = await getPublishedStar(parsed.data.starId);
    if (!star) return Response.json({ error: "CELEBRITY_NOT_FOUND" }, { status: 404 });

    const prompt = buildGeneratedTestPrompt(star);
    let generation = await generateReportText(GENERATED_TEST_SYSTEM_PROMPT, prompt, {
      temperature: 0.9,
      maxTokens: 16000,
      json: true,
    });
    let payload;
    try {
      payload = parseGeneratedPayload(generation.content);
    } catch {
      generation = await generateReportText(
        GENERATED_TEST_SYSTEM_PROMPT,
        `${prompt}\n\n上一次输出没有通过结构校验。请重新生成，并严格保证恰好25题、恰好5道风险题、题型数量符合要求。`,
        { temperature: 0.75, maxTokens: 16000, json: true },
      );
      payload = parseGeneratedPayload(generation.content);
    }

    const supabase = createSupabaseAdminClient();
    const { error: cleanupError } = await supabase
      .from("myfate_generated_tests")
      .delete()
      .lt("expires_at", new Date().toISOString());
    if (cleanupError) console.warn("Generated test cleanup skipped", cleanupError);
    const { data, error } = await supabase.from("myfate_generated_tests").insert({
      star_id: star.id,
      payload,
      provider: generation.provider,
      model: generation.model,
    }).select("id,expires_at").single();
    if (error) throw error;
    return Response.json({
      testId: data.id,
      expiresAt: data.expires_at,
      questions: publicQuestions(payload),
    }, { status: 201, headers: session.headers });
  } catch (error) {
    console.error("Generated fate test failed", error);
    return Response.json({ error: "TEST_GENERATION_FAILED" }, { status: 502 });
  }
}
