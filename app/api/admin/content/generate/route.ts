import { z } from "zod";
import { generateReportText } from "../../../myfate/personalize/model-provider";
import { adminError, adminJson, requireAdmin, writeAuditLog } from "../../server";
import {
  buildCelebrityProfileGenerationPrompt,
  CELEBRITY_PROFILE_GENERATION_SYSTEM_PROMPT,
  completeGeneratedCelebrityProfile,
  generatedCelebrityProfileSchema,
} from "./celebrity-profile";

const requestSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  name: z.string().trim().min(1).max(80),
  mbti: z.string().trim().toUpperCase().regex(/^(E|I)(N|S)(T|F)(J|P)$/u),
  birthDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/u),
  existing: z.record(z.string(), z.unknown()).optional(),
});

function generationError(error: unknown, request: Request) {
  const message = error instanceof Error ? error.message : "";
  if (message === "DEEPSEEK_API_KEY_MISSING") {
    return adminJson({ error: "ai_not_configured" }, request, undefined, { status: 503 });
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    console.error("Celebrity profile generation returned invalid content", error);
    return adminJson({ error: "ai_generation_invalid" }, request, undefined, { status: 502 });
  }
  if (message === "fetch failed" || message.startsWith("DEEPSEEK_") || message.startsWith("UNSUPPORTED_MYFATE_AI_PROVIDER")) {
    console.error("Celebrity profile generation failed", error);
    return adminJson({ error: "ai_generation_failed" }, request, undefined, { status: 502 });
  }
  return adminError(error, request);
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return adminJson({ error: "invalid_generation_input" }, request, admin, { status: 400 });
    }

    const generation = await generateReportText(
      CELEBRITY_PROFILE_GENERATION_SYSTEM_PROMPT,
      buildCelebrityProfileGenerationPrompt(parsed.data),
      { temperature: 0.55, maxTokens: 1800, json: true },
    );
    const generatedJson = JSON.parse(generation.content) as unknown;
    const profile = generatedCelebrityProfileSchema.parse(generatedJson);
    const generated = completeGeneratedCelebrityProfile(parsed.data, profile);

    await writeAuditLog(admin, "celebrity_profile_generate", "celebrity_profile", parsed.data.id, {
      provider: generation.provider,
      model: generation.model,
      saved: false,
    });
    return adminJson({ generated }, request, admin);
  } catch (error) {
    return generationError(error, request);
  }
}
