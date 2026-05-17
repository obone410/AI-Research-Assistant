import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { z } from "zod";
import { serverConfig, shouldUseDemoAi } from "@/lib/config";
import type { PromptTemplate } from "@/lib/ai/prompts";

type GenerateJsonInput<T extends z.ZodType> = {
  template: PromptTemplate;
  prompt: string;
  schema: T;
};

export type AiCallMetadata = {
  provider: string;
  model: string;
  promptVersion: string;
};

export class AiProviderUnavailableError extends Error {
  constructor() {
    super("No AI provider key is configured. Demo mode should handle this call.");
  }
}

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] ?? trimmed;
}

function parseStructuredJson<T extends z.ZodType>(text: string, schema: T) {
  return schema.parse(JSON.parse(extractJson(text)));
}

function repairPrompt(prompt: string) {
  return `${prompt}

Your previous response could not be parsed as strict JSON. Return a smaller valid
JSON object only. Do not use markdown, comments, ellipses, trailing commas, or
extra prose. Keep arrays to at most 3 items unless the schema requires more.`;
}

export async function generateStructuredJson<T extends z.ZodType>({
  template,
  prompt,
  schema,
}: GenerateJsonInput<T>): Promise<{
  output: z.infer<T>;
  metadata: AiCallMetadata;
}> {
  if (shouldUseDemoAi()) {
    throw new AiProviderUnavailableError();
  }

  async function runAnthropic(promptText: string, repair = false) {
    const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey });
    const response = await anthropic.messages.create({
      model: serverConfig.anthropicModel,
      max_tokens: repair
        ? Math.min(Math.max(template.maxTokens * 2, 3000), 6000)
        : template.maxTokens,
      temperature: repair ? 0 : template.temperature,
      system:
        "You return strict JSON only. Do not wrap JSON in markdown fences.",
      messages: [{ role: "user", content: promptText }],
    });

    return response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }

  async function runOpenAi(promptText: string, repair = false) {
    const openai = new OpenAI({ apiKey: serverConfig.openAiApiKey });
    const response = await openai.chat.completions.create({
      model: serverConfig.openAiChatModel,
      messages: [
        {
          role: "system",
          content:
            "You are ResearchOS. Return strict JSON only. Do not wrap JSON in markdown fences.",
        },
        { role: "user", content: promptText },
      ],
      response_format: { type: "json_object" },
      temperature: repair ? 0 : template.temperature,
      max_tokens: repair
        ? Math.min(Math.max(template.maxTokens * 2, 3000), 6000)
        : template.maxTokens,
    });

    return response.choices[0]?.message?.content ?? "{}";
  }

  const provider = serverConfig.aiProvider;
  const model =
    provider === "anthropic"
      ? serverConfig.anthropicModel
      : serverConfig.openAiChatModel;
  const runProvider = provider === "anthropic" ? runAnthropic : runOpenAi;

  const text = await runProvider(prompt);

  try {
    return {
      output: parseStructuredJson(text, schema),
      metadata: {
        provider,
        model,
        promptVersion: template.version,
      },
    };
  } catch {
    const repairedText = await runProvider(repairPrompt(prompt), true);

    return {
      output: parseStructuredJson(repairedText, schema),
      metadata: {
        provider,
        model,
        promptVersion: template.version,
      },
    };
  }
}
