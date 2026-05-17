import { z } from "zod";
import {
  answerSchema,
  knowledgeExtractionSchema,
  insightsSchema,
  keywordsSchema,
  synthesisReportSchema,
  summarySchema,
  type AnswerOutput,
  type KnowledgeExtractionOutput,
  type SynthesisReportOutput,
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
  addCollectionQaMessage,
  getCachedOutput,
  getCachedQaResponse,
  getCollectionDetail,
  getCollectionChunks,
  getProjectChunks,
  recordPipelineRun,
  recordUsageMetric,
  retrieveRelevantChunks,
  retrieveRelevantCollectionChunks,
  saveOutput,
  saveCachedQaResponse,
  saveCollectionKnowledge,
  saveCollectionSynthesisReport,
  type ResearchContext,
} from "@/lib/research/repository";
import {
  demoAnswer,
  demoKnowledgeExtraction,
  demoInsights,
  demoKeywords,
  demoSynthesis,
  demoSummary,
} from "@/lib/research/demo-ai";
import type {
  Citation,
  DocumentChunk,
  RetrievalHit,
  SynthesisReportKind,
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
    documentId: chunk.documentId,
    documentTitle: "documentTitle" in chunk ? chunk.documentTitle ?? null : null,
    projectId: chunk.projectId,
    projectTitle: "projectTitle" in chunk ? chunk.projectTitle ?? null : null,
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
        documentId: chunk.documentId,
        documentTitle:
          "documentTitle" in chunk
            ? chunk.documentTitle ?? citation.documentTitle ?? null
            : citation.documentTitle ?? null,
        projectId: chunk.projectId,
        projectTitle:
          "projectTitle" in chunk
            ? chunk.projectTitle ?? citation.projectTitle ?? null
            : citation.projectTitle ?? null,
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
  const questionHash = sha256(
    `project:${projectId}:${question.trim().toLowerCase()}:${hits
      .map((hit) => hit.id)
      .join("|")}`,
  );
  const cached = await getCachedQaResponse(ctx, {
    scope: "project",
    questionHash,
  });

  if (cached) {
    const output = cached.output as AnswerOutput;
    const saved = await addQaMessage(
      ctx,
      projectId,
      question,
      output.answer,
      output.citations.length
        ? output.citations
        : hits.slice(0, 2).map(citationFromChunk),
      cached.provider,
      cached.model,
    );

    return { output, message: saved, cached: true };
  }

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
    const tokenEstimate = estimateTokens(prompt);
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
    await saveCachedQaResponse(ctx, {
      scope: "project",
      projectId,
      questionHash,
      question,
      output: normalized,
      provider: metadata.provider,
      model: metadata.model,
      tokenEstimate,
    });

    return { output: normalized, message: saved, cached: false };
  } catch (error) {
    if (!shouldUseDemoFallback(error)) {
      throw error;
    }

    const output = demoAnswer(question, hits);
    await saveCachedQaResponse(ctx, {
      scope: "project",
      projectId,
      questionHash,
      question,
      output,
      provider: "demo",
      model: "demo",
      tokenEstimate: 0,
    });
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

function formatCollectionContext(hits: RetrievalHit[]) {
  return hits
    .map(
      (hit) =>
        `[source=${hit.projectTitle ?? "Untitled project"}; document=${hit.documentTitle ?? hit.documentId}; chunkId=${hit.id}; chunkIndex=${hit.chunkIndex}; section=${hit.sectionTitle ?? "Untitled"}; similarity=${hit.similarity.toFixed(2)}]\n${hit.content}`,
    )
    .join("\n\n");
}

function reportTitle(kind: SynthesisReportKind, collectionName: string) {
  const label: Record<SynthesisReportKind, string> = {
    combined_summary: "Unified Research Report",
    source_comparison: "Source Comparison",
    executive_brief: "Executive Brief",
    trend_analysis: "Trend Analysis",
    research_gaps: "Research Gaps",
    contradiction_analysis: "Contradiction Analysis",
    opportunity_analysis: "Opportunity Analysis",
    key_takeaways: "Key Takeaways",
    recommendation_summary: "Recommendation Summary",
    confidence_report: "Research Confidence Report",
    hypothesis_generation: "Hypothesis Map",
    claim_validation: "Claim Validation",
    evidence_summary: "Evidence Summary",
    strategic_insight_report: "Strategic Insight Report",
    analytical_briefing: "Analytical Briefing",
    collection_comparison_report: "Collection Comparison Report",
  };

  return `${collectionName} ${label[kind]}`;
}

function normalizeKnowledge(
  output: KnowledgeExtractionOutput,
  hits: RetrievalHit[],
) {
  return {
    entities: output.entities.map((entity) => ({
      ...entity,
      projectId: null,
    })),
    insights: output.linkedInsights.map((insight) => ({
      ...normalizeCitations(insight, hits),
      projectId: null,
    })),
    claims: output.claims.map((claim) => ({
      ...normalizeCitations(claim, hits),
      projectId: null,
    })),
    relationships: output.relationships,
  };
}

export async function synthesizeCollection(
  ctx: ResearchContext,
  collectionId: string,
  kind: SynthesisReportKind,
  options: { focusQuestion?: string | null } = {},
) {
  const startedAt = Date.now();
  const collection = await getCollectionDetail(ctx, collectionId);
  const chunks = await getCollectionChunks(ctx, collectionId);
  const selectedChunks = chunks.slice(0, kind === "executive_brief" ? 10 : 16);
  const fallbackName = collection?.name ?? "Research collection";

  await recordPipelineRun(ctx, {
    collectionId,
    name: reportTitle(kind, fallbackName),
    steps: ["Upload", "Extract", "Chunk", "Analyze", "Summarize", "Compare", "Export"],
  });

  try {
    if (!selectedChunks.length) {
      throw new AiProviderUnavailableError();
    }

    const template = promptTemplates.synthesizeCollection;
    const prompt = renderPrompt(template, {
      kind,
      collectionName: fallbackName,
      focusQuestion:
        options.focusQuestion?.trim() ||
        "No extra focus question. Follow the report kind.",
      context: compactForPrompt(formatCollectionContext(selectedChunks), 6800),
    });
    const { output, metadata } = await generateStructuredJson({
      template,
      prompt,
      schema: synthesisReportSchema,
    });
    const normalized = normalizeCitations(output, selectedChunks) as SynthesisReportOutput;
    const title = normalized.title || reportTitle(kind, fallbackName);
    const report = await saveCollectionSynthesisReport(ctx, {
      collectionId,
      kind,
      title,
      output: normalized,
      citations: normalized.citations,
      provider: metadata.provider,
      model: metadata.model,
      promptVersion: metadata.promptVersion,
      tokenEstimate: estimateTokens(prompt),
    });

    await recordUsageMetric(ctx, {
      collectionId,
      projectId: null,
      action: `collection.${kind}`,
      provider: metadata.provider,
      model: metadata.model,
      tokenEstimate: estimateTokens(prompt),
      latencyMs: Date.now() - startedAt,
      chunkCount: selectedChunks.length,
    });

    return { output: normalized, report, cached: false };
  } catch (error) {
    if (!shouldUseDemoFallback(error)) {
      throw error;
    }

    const output = demoSynthesis(kind, fallbackName, selectedChunks);
    const report = await saveCollectionSynthesisReport(ctx, {
      collectionId,
      kind,
      title: output.title,
      output,
      citations: output.citations,
      provider: "demo",
      model: "demo",
      promptVersion: "v1",
      tokenEstimate: 0,
    });
    await recordUsageMetric(ctx, {
      collectionId,
      projectId: null,
      action: `collection.${kind}`,
      provider: "demo",
      model: "demo",
      tokenEstimate: 0,
      latencyMs: Date.now() - startedAt,
      chunkCount: selectedChunks.length,
    });

    return { output, report, cached: false, demo: true };
  }
}

export async function extractCollectionKnowledge(
  ctx: ResearchContext,
  collectionId: string,
) {
  const startedAt = Date.now();
  const chunks = await getCollectionChunks(ctx, collectionId);
  const selectedChunks = chunks.slice(0, 16);

  try {
    if (!selectedChunks.length) {
      throw new AiProviderUnavailableError();
    }

    const template = promptTemplates.extractKnowledge;
    const prompt = renderPrompt(template, {
      context: compactForPrompt(formatCollectionContext(selectedChunks), 6200),
    });
    const { output, metadata } = await generateStructuredJson({
      template,
      prompt,
      schema: knowledgeExtractionSchema,
    });
    const normalized = normalizeKnowledge(output, selectedChunks);
    const saved = await saveCollectionKnowledge(ctx, {
      collectionId,
      ...normalized,
    });

    await recordPipelineRun(ctx, {
      collectionId,
      name: "Knowledge extraction",
      steps: ["Analyze", "Extract entities", "Link insights", "Store research memory"],
    });
    await recordUsageMetric(ctx, {
      collectionId,
      projectId: null,
      action: "collection.knowledge",
      provider: metadata.provider,
      model: metadata.model,
      tokenEstimate: estimateTokens(prompt),
      latencyMs: Date.now() - startedAt,
      chunkCount: selectedChunks.length,
    });

    return { output, saved, cached: false };
  } catch (error) {
    if (!shouldUseDemoFallback(error)) {
      throw error;
    }

    const output = demoKnowledgeExtraction(selectedChunks);
    const saved = await saveCollectionKnowledge(ctx, {
      collectionId,
      ...normalizeKnowledge(output, selectedChunks),
    });
    await recordPipelineRun(ctx, {
      collectionId,
      name: "Knowledge extraction",
      steps: ["Analyze", "Extract entities", "Link insights", "Store research memory"],
    });
    await recordUsageMetric(ctx, {
      collectionId,
      projectId: null,
      action: "collection.knowledge",
      provider: "demo",
      model: "demo",
      tokenEstimate: 0,
      latencyMs: Date.now() - startedAt,
      chunkCount: selectedChunks.length,
    });

    return { output, saved, cached: false, demo: true };
  }
}

export async function answerCollectionQuestion(
  ctx: ResearchContext,
  collectionId: string,
  question: string,
) {
  const startedAt = Date.now();
  const hits = await retrieveRelevantCollectionChunks(ctx, collectionId, question, 8);
  const questionHash = sha256(
    `collection:${collectionId}:${question.trim().toLowerCase()}:${hits
      .map((hit) => hit.id)
      .join("|")}`,
  );
  const cached = await getCachedQaResponse(ctx, {
    scope: "collection",
    questionHash,
  });

  if (cached) {
    const output = cached.output as AnswerOutput;
    const saved = await addCollectionQaMessage(
      ctx,
      collectionId,
      question,
      output.answer,
      output.citations.length
        ? output.citations
        : hits.slice(0, 3).map(citationFromChunk),
      cached.provider,
      cached.model,
    );

    await recordUsageMetric(ctx, {
      collectionId,
      projectId: null,
      action: "collection.chat.cached",
      provider: cached.provider,
      model: cached.model,
      tokenEstimate: cached.tokenEstimate,
      latencyMs: Date.now() - startedAt,
      chunkCount: hits.length,
    });

    return { output, message: saved, cached: true };
  }

  try {
    const template = promptTemplates.answerCollectionQuestion;
    const prompt = renderPrompt(template, {
      question,
      context: compactForPrompt(formatCollectionContext(hits), 5200),
    });
    const { output, metadata } = await generateStructuredJson({
      template,
      prompt,
      schema: answerSchema,
    });

    const normalized = normalizeCitations(output, hits) as AnswerOutput;
    const tokenEstimate = estimateTokens(prompt);
    const saved = await addCollectionQaMessage(
      ctx,
      collectionId,
      question,
      normalized.answer,
      normalized.citations.length
        ? normalized.citations
        : hits.slice(0, 3).map(citationFromChunk),
      metadata.provider,
      metadata.model,
    );
    await saveCachedQaResponse(ctx, {
      scope: "collection",
      collectionId,
      questionHash,
      question,
      output: normalized,
      provider: metadata.provider,
      model: metadata.model,
      tokenEstimate,
    });

    await recordUsageMetric(ctx, {
      collectionId,
      projectId: null,
      action: "collection.chat",
      provider: metadata.provider,
      model: metadata.model,
      tokenEstimate,
      latencyMs: Date.now() - startedAt,
      chunkCount: hits.length,
    });

    return { output: normalized, message: saved, cached: false };
  } catch (error) {
    if (!shouldUseDemoFallback(error)) {
      throw error;
    }

    const output = demoAnswer(question, hits);
    await saveCachedQaResponse(ctx, {
      scope: "collection",
      collectionId,
      questionHash,
      question,
      output,
      provider: "demo",
      model: "demo",
      tokenEstimate: 0,
    });
    const saved = await addCollectionQaMessage(
      ctx,
      collectionId,
      question,
      output.answer,
      output.citations,
      "demo",
      "demo",
    );
    await recordUsageMetric(ctx, {
      collectionId,
      projectId: null,
      action: "collection.chat",
      provider: "demo",
      model: "demo",
      tokenEstimate: 0,
      latencyMs: Date.now() - startedAt,
      chunkCount: hits.length,
    });

    return { output, message: saved, cached: false, demo: true };
  }
}
