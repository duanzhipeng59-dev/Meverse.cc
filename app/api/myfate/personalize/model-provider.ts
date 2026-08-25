import { z } from "zod";

const deepSeekResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable() }),
    finish_reason: z.string().optional(),
  })).min(1),
});

export type ModelGeneration = {
  content: string;
  provider: "deepseek";
  model: string;
};

async function generateWithDeepSeek(system: string, prompt: string): Promise<ModelGeneration> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY_MISSING");
  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/u, "");
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
      temperature: 0.7,
      max_tokens: 4200,
      stream: false,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`DEEPSEEK_HTTP_${response.status}`);
  const parsed = deepSeekResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("DEEPSEEK_RESPONSE_INVALID");
  const content = parsed.data.choices[0].message.content?.trim();
  if (!content) throw new Error("DEEPSEEK_RESPONSE_EMPTY");
  return { content, provider: "deepseek", model };
}

export async function generateReportJson(system: string, prompt: string): Promise<ModelGeneration> {
  const provider = process.env.MYFATE_AI_PROVIDER ?? "deepseek";
  if (provider === "deepseek") return generateWithDeepSeek(system, prompt);
  // Gemini will be added here without changing scoring, prompt construction, or report rendering.
  throw new Error(`UNSUPPORTED_MYFATE_AI_PROVIDER:${provider}`);
}
