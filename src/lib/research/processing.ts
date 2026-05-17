import { z } from "zod";
import {
  answerSchema,
  insightsSchema,
  keywordsSchema,
  summarySchema,
  type AnswerOutput,
} from "@/lib/ai/schemas";
import { embedTexts } from "@/lib/ai/embeddings";
import { promptTemplates, renderPrompt } from "@/lib/ai/prompts";
import { shouldUseDemoAi } from "@/lib/config";
import {
  AiProviderUnavailableError,
  generateStructuredJson,
} from "@/lib/ai/providers";
import { compactForPrompt, estimateTokens } from "@/lib/documents/chunk";
import { sha256 } from "@/lib/research/hash";
import {
  addQaMessage,
  getCachedOutput,
  getProjectChunks,
  retrieveRelevantChunks,
  saveOutput,
  type ResearchContext,
} from "@/lib/research/repository";
import {
  demoAnswer,
  demoInsights,
  demoKeywords,
  demoSummary,
} from "@/lib/research/demo-ai";
import type {
  Citation,
  DocumentChunk,
  RetrievalHit,
  SummaryDepth,
} from "@/lib/research/types";

const chunkSummarySchema = z.object({
  chunkIndex: z.number(),
  sectionTitle: z.string().nullable().optional(),
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
});

function chunksHash(chunks: DocumentChunk[], suffix = "") {
  return sha256(
    `${chunks.map((chunk) => `${chunk.id}:${chunk.tokenCount}`).join("|")}:${suffix}`,
  );
}

function shouldUseDemoFallback(error: unknown) {
  return shouldUseDemoAi() || error instanceof AiProviderUnavailableError;
}

function citationFromChunk(chunk: DocumentChunk | RetrievalHit): Citation {
  return {
    chunkId: chunk.id,
    chunkIndex: chunk.chunkIndex,
    sectionTitle: chunk.sectionTitle ?? null,
    pageStart: chunk.pageStart ?? null,
    pageEnd: chunk.pageEnd ?? null,
    quote: chunk.content.slice(0, 260),
    similarity: "similarity" in chunk ? chunk.similarity : undefined,
  };
}

function normalizeCitations<T extends { citations: Citation[] }>(
  output: T,
  sourceChunks: Array<DocumentChunk | RetrievalHit>,
) {
  const byIndex = new Map(sourceChunks.map((chunk) => [chunk.chunkIndex, chunk]));
  const byId = new Map(sourceChunks.map((chunk) => [chunk.id, chunk]));

  return {
    ...output,
    citations: output.citations.map((citation) => {
      const chunk =
        byId.get(citation.chunkId) ?? byIndex.get(citation.chunkIndex);

      if (!chunk) {
        return citation;
      }

      return {
        ...citation,
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
        sectionTitle: chunk.sectionTitle ?? citation.sectionTitle ?? null,
        pageStart: chunk.pageStart ?? citation.pageStart ?? null,
        pageEnd: chunk.pageEnd ?? citation.pageEnd ?? null,
      };
    }),
  };
}

export async function generateEmbeddingsForChunks(
  chunks: Array<{ content: string }>,
) {
  return embedTexts(chunks.map((chunk) => chunk.content));
}

export async function summarizeProject(
  ctx: ResearchContext,
  projectId: string,
  depth: SummaryDepth,
) {
  const chunks = await getProjectChunks(ctx, projectId);
  const inputHash = chunksHash(chunks, depth);
  const cached = await getCachedOutput(ctx, projectId, "summary", inputHash, depth);

  if (cached) {
    return { output: cached, cached: true };
  }

  try {
    const maxChunks = depth === "short" ? 5 : depth === "detailed" ? 10 : 14;
    const selectedChunks = chunks.slice(0, maxChunks);

    if (!selectedChunks.length) {
      throw new AiProviderUnavailableError();
    }

    const chunkSummaries = [];

    for (const chunk of selectedChunks) {
      const template = promptTemplates.summarizeChunk;
      const prompt = renderPrompt(template, {
        chunkIndex: chunk.chunkIndex,
        sectionTitle: chunk.sectionTitle ?? "Untitled section",
        chunk: compactForPrompt(chunk.content, 900),
      });

      const { output } = await generateStructuredJson({
        template,
        prompt,
        schema: chunkSummarySchema,
      });
      chunkSummaries.push(output);
    }

    const template = promptTemplates.summarizeDocument;
    const prompt = renderPrompt(template, {
      depth,
      chunkSummaries: JSON.stringify(chunkSummaries, null, 2),
    });

    const { output, metadata } = await generateStructuredJson({
      template,
      prompt,
      schema: summarySchema,
    });

    const normalized = normalizeCitations(output, selectedChunks);
    await saveOutput(ctx, {
      projectId,
      documentId: chunks[0]?.documentId,
      kind: "summary",
      depth,
      inputHash,
      output: normalized,
      provider: metadata.provider,
      model: metadata.model,
      promptVersion: metadata.promptVersion,
      tokenEstimate: estimateTokens(prompt),
    });

    return { output: normalized, cached: false };
  } catch (error) {
    if (!shouldUseDemoFallback(error)) {
      throw error;
    }

    const output = demoSummary(chunks, depth);
    await saveOutput(ctx, {
      projectId,
      documentId: chunks[0]?.documentId,
      kind: "summary",
      depth,
      inputHash,
      output,
      provider: "demo",
      model: "demo",
      promptVersion: "v1",
      tokenEstimate: 0,
    });
    return { output, cached: false, demo: true };
  }
}

export async function extractInsights(ctx: ResearchContext, projectId: string) {
  const chunks = await getProjectChunks(ctx, projectId);
  const inputHash = chunksHash(chunks, "insights");
  const cached = await getCachedOutput(ctx, projectId, "insights", inputHash);

  if (cached) {
    return { output: cached, cached: true };
  }

  try {
    const template = promptTemplates.extractInsights;
    const text = compactForPrompt(
      chunks.map((chunk) => `[Chunk ${chunk.chunkIndex}]\n${chunk.content}`).join("\n\n"),
      5200,
    );
    const prompt = renderPrompt(template, { text });
    const { output, metadata } = await generateStructuredJson({
      template,
      prompt,
      schema: insightsSchema,
    });

    await saveOutput(ctx, {
      projectId,
      documentId: chunks[0]?.documentId,
      kind: "insights",
      inputHash,
      output,
      provider: metadata.provider,
      model: metadata.model,
      promptVersion: metadata.promptVersion,
      tokenEstimate: estimateTokens(prompt),
    });

    return { output, cached: false };
  } catch (error) {
    if (!shouldUseDemoFallback(error)) {
      throw error;
    }

    const output = demoInsights(chunks);
    await saveOutput(ctx, {
      projectId,
      documentId: chunks[0]?.documentId,
      kind: "insights",
      inputHash,
      output,
      provider: "demo",
      model: "demo",
      promptVersion: "v1",
      tokenEstimate: 0,
    });
    return { output, cached: false, demo: true };
  }
}

export async function generateKeywords(ctx: ResearchContext, projectId: string) {
  const chunks = await getProjectChunks(ctx, projectId);
  const inputHash = chunksHash(chunks, "keywords");
  const cached = await getCachedOutput(ctx, projectId, "keywords", inputHash);

  if (cached) {
    return { output: cached, cached: true };
  }

  try {
    const template = promptTemplates.generateKeywords;
    const text = compactForPrompt(
      chunks.map((chunk) => chunk.content).join("\n\n"),
      4200,
    );
    const prompt = renderPrompt(template, { text });
    const { output, metadata } = await generateStructuredJson({
      template,
      prompt,
      schema: keywordsSchema,
    });

    await saveOutput(ctx, {
      projectId,
      documentId: chunks[0]?.documentId,
      kind: "keywords",
      inputHash,
      output,
      provider: metadata.provider,
      model: metadata.model,
      promptVersion: metadata.promptVersion,
      tokenEstimate: estimateTokens(prompt),
    });

    return { output, cached: false };
  } catch (error) {
    if (!shouldUseDemoFallback(error)) {
      throw error;
    }

    const output = demoKeywords();
    await saveOutput(ctx, {
      projectId,
      documentId: chunks[0]?.documentId,
      kind: "keywords",
      inputHash,
      output,
      provider: "demo",
      model: "demo",
      promptVersion: "v1",
      tokenEstimate: 0,
    });
    return { output, cached: false, demo: true };
  }
}

function formatRetrievedContext(hits: RetrievalHit[]) {
  return hits
    .map(
      (hit) =>
        `[chunkId=${hit.id}; chunkIndex=${hit.chunkIndex}; section=${hit.sectionTitle ?? "Untitled"}; similarity=${hit.similarity.toFixed(2)}]\n${hit.content}`,
    )
    .join("\n\n");
}

export async function answerQuestion(
  ctx: ResearchContext,
  projectId: string,
  question: string,
) {
  const hits = await retrieveRelevantChunks(ctx, projectId, question, 6);

  try {
    const template = promptTemplates.answerQuestion;
    const prompt = renderPrompt(template, {
      question,
      context: compactForPrompt(formatRetrievedContext(hits), 4200),
    });
    const { output, metadata } = await generateStructuredJson({
      template,
      prompt,
      schema: answerSchema,
    });

    const normalized = normalizeCitations(output, hits) as AnswerOutput;
    const saved = await addQaMessage(
      ctx,
      projectId,
      question,
      normalized.answer,
      normalized.citations.length
        ? normalized.citations
        : hits.slice(0, 2).map(citationFromChunk),
      metadata.provider,
      metadata.model,
    );

    return { output: normalized, message: saved, cached: false };
  } catch (error) {
    if (!shouldUseDemoFallback(error)) {
      throw error;
    }

    const output = demoAnswer(question, hits);
    const saved = await addQaMessage(
      ctx,
      projectId,
      question,
      output.answer,
      output.citations,
      "demo",
      "demo",
    );
    return { output, message: saved, cached: false, demo: true };
  }
}
