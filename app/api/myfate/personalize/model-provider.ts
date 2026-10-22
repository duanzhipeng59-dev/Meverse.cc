import { z } from "zod";

const deepSeekResponseSchema = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable() }),
    finish_reason: z.string().optional(),
  })).min(1),
});

const geminiResponseSchema = z.object({
  candidates: z.array(z.object({
    content: z.object({ parts: z.array(z.object({ text: z.string() })).min(1) }),
  })).min(1),
});

export type ModelGeneration = {
  content: string;
  provider: "deepseek" | "gemini";
  model: string;
};

export type ModelGenerationOptions = {
  provider?: "deepseek" | "gemini";
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
};

async function generateWithGemini(
  system: string,
  prompt: string,
  options: ModelGenerationOptions = {},
): Promise<ModelGeneration> {
  // OpenAI 兼容中转(如 api.b.ai,/v1/chat/completions + Bearer);
  // 默认走 Google 原生协议(generativelanguage.googleapis.com)。
  if (process.env.GEMINI_API_STYLE === "openai") return generateWithGeminiViaOpenAI(system, prompt, options);
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");
  const model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
  const baseUrl = (process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/u, "");
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.8,
    maxOutputTokens: options.maxTokens ?? 5000,
  };
  if (options.json) generationConfig.responseMimeType = "application/json";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (response.ok) {
      const parsed = geminiResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("GEMINI_RESPONSE_INVALID");
      const content = parsed.data.candidates[0].content.parts.map((part) => part.text).join("").trim();
      if (!content) throw new Error("GEMINI_RESPONSE_EMPTY");
      return { content, provider: "gemini", model };
    }
    if ((response.status !== 429 && response.status !== 503) || attempt === 2) {
      throw new Error(`GEMINI_HTTP_${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
  }
  throw new Error("GEMINI_RETRY_EXHAUSTED");
}

// Gemini 经 OpenAI 兼容中转站调用:响应结构与 DeepSeek/OpenAI chat completions 一致,复用同一 schema。
async function generateWithGeminiViaOpenAI(
  system: string,
  prompt: string,
  options: ModelGenerationOptions = {},
): Promise<ModelGeneration> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY_MISSING");
  const model = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
  const baseUrl = (process.env.GEMINI_BASE_URL ?? "").replace(/\/$/u, "");
  if (!baseUrl) throw new Error("GEMINI_BASE_URL_MISSING");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 5000,
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
        stream: false,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (response.ok) {
      const parsed = deepSeekResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("GEMINI_RESPONSE_INVALID");
      const content = parsed.data.choices[0].message.content?.trim();
      if (!content) throw new Error("GEMINI_RESPONSE_EMPTY");
      return { content, provider: "gemini", model };
    }
    if ((response.status !== 429 && response.status !== 503) || attempt === 2) {
      throw new Error(`GEMINI_HTTP_${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
  }
  throw new Error("GEMINI_RETRY_EXHAUSTED");
}

async function generateWithDeepSeek(
  system: string,
  prompt: string,
  options: ModelGenerationOptions = {},
): Promise<ModelGeneration> {
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
      thinking: { type: "disabled" },
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 5000,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
      stream: false,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`DEEPSEEK_HTTP_${response.status}`);
  const parsed = deepSeekResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("DEEPSEEK_RESPONSE_INVALID");
  const content = parsed.data.choices[0].message.content?.trim();
  if (!content) throw new Error("DEEPSEEK_RESPONSE_EMPTY");
  return { content, provider: "deepseek", model };
}

export async function generateReportText(
  system: string,
  prompt: string,
  options: ModelGenerationOptions = {},
): Promise<ModelGeneration> {
  const provider = options.provider ?? (process.env.MYFATE_AI_PROVIDER ?? "deepseek");
  if (provider === "gemini") return generateWithGemini(system, prompt, options);
  if (provider === "deepseek") return generateWithDeepSeek(system, prompt, options);
  throw new Error(`UNSUPPORTED_MYFATE_AI_PROVIDER:${provider}`);
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

async function generateChatWithDeepSeek(
  system: string,
  messages: ChatMessage[],
  options: ModelGenerationOptions = {},
): Promise<ModelGeneration> {
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
      messages: [{ role: "system", content: system }, ...messages],
      thinking: { type: "disabled" },
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 2000,
      ...(options.json ? { response_format: { type: "json_object" } } : {}),
      stream: false,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`DEEPSEEK_HTTP_${response.status}`);
  const parsed = deepSeekResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("DEEPSEEK_RESPONSE_INVALID");
  const content = parsed.data.choices[0].message.content?.trim();
  if (!content) throw new Error("DEEPSEEK_RESPONSE_EMPTY");
  return { content, provider: "deepseek", model };
}

async function generateChatWithGemini(
  system: string,
  messages: ChatMessage[],
  options: ModelGenerationOptions = {},
): Promise<ModelGeneration> {
  const transcript = messages.map((message) => `${message.role === "assistant" ? "assistant" : "user"}: ${message.content}`).join("\n\n");
  return generateWithGemini(system, transcript, options);
}

export async function generateChatText(
  system: string,
  messages: ChatMessage[],
  options: ModelGenerationOptions = {},
): Promise<ModelGeneration> {
  const provider = options.provider ?? (process.env.MYFATE_AI_PROVIDER ?? "deepseek");
  if (provider === "gemini") return generateChatWithGemini(system, messages, options);
  if (provider === "deepseek") return generateChatWithDeepSeek(system, messages, options);
  throw new Error(`UNSUPPORTED_MYFATE_AI_PROVIDER:${provider}`);
}
