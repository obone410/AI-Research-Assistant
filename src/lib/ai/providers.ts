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

  if (serverConfig.aiProvider === "anthropic") {
    const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey });
    const response = await anthropic.messages.create({
      model: serverConfig.anthropicModel,
      max_tokens: template.maxTokens,
      temperature: template.temperature,
      system:
        "You return strict JSON only. Do not wrap JSON in markdown fences.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return {
      output: schema.parse(JSON.parse(extractJson(text))),
      metadata: {
        provider: "anthropic",
        model: serverConfig.anthropicModel,
        promptVersion: template.version,
      },
    };
  }

  const openai = new OpenAI({ apiKey: serverConfig.openAiApiKey });
  const response = await openai.chat.completions.create({
    model: serverConfig.openAiChatModel,
    messages: [
      {
        role: "system",
        content:
          "You are ResearchOS. Return strict JSON only. Do not wrap JSON in markdown fences.",
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: template.temperature,
    max_tokens: template.maxTokens,
  });

  const text = response.choices[0]?.message?.content ?? "{}";

  return {
    output: schema.parse(JSON.parse(extractJson(text))),
    metadata: {
      provider: "openai",
      model: serverConfig.openAiChatModel,
      promptVersion: template.version,
    },
  };
}
