import OpenAI from "openai";
import { serverConfig } from "@/lib/config";

export function canGenerateEmbeddings() {
  return Boolean(!serverConfig.demoMode && serverConfig.openAiApiKey);
}

export async function embedTexts(texts: string[]) {
  if (!canGenerateEmbeddings()) {
    return texts.map(() => null);
  }

  const openai = new OpenAI({ apiKey: serverConfig.openAiApiKey });
  const response = await openai.embeddings.create({
    model: serverConfig.openAiEmbeddingModel,
    input: texts,
  });

  return response.data.map((item) => item.embedding);
}

export async function embedText(text: string) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

export function vectorLiteral(embedding: number[] | null) {
  if (!embedding) {
    return null;
  }

  return `[${embedding.map((value) => Number(value).toFixed(8)).join(",")}]`;
}
