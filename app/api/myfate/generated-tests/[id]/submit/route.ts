import { z } from "zod";
import { createSupabaseAdminClient } from "../../../../auth/server";
import { requireReportUser } from "../../../reports/server";
import { evaluateGeneratedTest, storedGeneratedPayloadSchema } from "../../server";

const answerSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)).length(25),
  reportId: z.string().uuid(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireReportUser(request);
    if (!session) return Response.json({ error: "LOGIN_REQUIRED" }, { status: 401 });
    const parsed = answerSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "INVALID_ANSWERS" }, { status: 400 });
    const { id } = await context.params;
    const supabase = createSupabaseAdminClient();
    const { data: report, error: reportError } = await supabase
      .from("myfate_reports")
      .select("id,star_id,interpretation")
      .eq("id", parsed.data.reportId)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (reportError) throw reportError;
    const marker = (report?.interpretation ?? {}) as { generatedTestId?: string };
    if (!report || marker.generatedTestId !== id) {
      return Response.json({ error: "TEST_NOT_OWNED" }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("myfate_generated_tests")
      .select("id,star_id,payload,expires_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "TEST_NOT_FOUND" }, { status: 404 });
    if (data.star_id !== report.star_id) return Response.json({ error: "TEST_NOT_OWNED" }, { status: 403 });
    if (new Date(data.expires_at).getTime() <= Date.now()) {
      return Response.json({ error: "TEST_EXPIRED" }, { status: 410 });
    }
    const payload = storedGeneratedPayloadSchema.parse(data.payload);
    const result = evaluateGeneratedTest(data.id, data.star_id, payload, parsed.data.answers);
    return Response.json({ result }, { headers: session.headers });
  } catch (error) {
    console.error("Generated fate test evaluation failed", error);
    return Response.json({ error: "TEST_EVALUATION_FAILED" }, { status: 502 });
  }
}
