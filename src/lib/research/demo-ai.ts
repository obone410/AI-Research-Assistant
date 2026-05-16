import type {
  AnswerOutput,
  InsightsOutput,
  KeywordsOutput,
  SummaryOutput,
} from "@/lib/ai/schemas";
import type { DocumentChunk, RetrievalHit, SummaryDepth } from "@/lib/research/types";

function citationFromChunk(chunk: DocumentChunk) {
  return {
    chunkId: chunk.id,
    chunkIndex: chunk.chunkIndex,
    sectionTitle: chunk.sectionTitle ?? null,
    pageStart: chunk.pageStart ?? null,
    pageEnd: chunk.pageEnd ?? null,
    quote: chunk.content.slice(0, 220),
    similarity: "similarity" in chunk ? (chunk as RetrievalHit).similarity : undefined,
  };
}

export function demoSummary(
  chunks: DocumentChunk[],
  depth: SummaryDepth,
): SummaryOutput {
  const first = chunks[0];
  const second = chunks[1] ?? first;

  return {
    depth,
    title: "Research intelligence summary",
    abstract:
      "This document describes a research workflow that moves beyond simple summarization into structured ingestion, retrieval, extraction, and reusable reporting.",
    sections: [
      {
        heading: "Core argument",
        content:
          "The strongest signal is the combination of document chunking, targeted retrieval, and structured AI outputs. That makes the system useful for repeatable research workflows rather than isolated summaries.",
      },
      {
        heading: "Operational value",
        content:
          "The architecture reduces token usage by caching unchanged files, compressing long documents, and injecting only relevant chunks into Q&A prompts.",
      },
    ],
    keyTakeaways: [
      "Use RAG to ground Q&A in cited document chunks.",
      "Cache outputs by document hash to avoid re-processing unchanged files.",
      "Store findings, claims, entities, and gaps as reusable research assets.",
    ],
    citations: first ? [citationFromChunk(first), citationFromChunk(second)] : [],
    tokenStrategy:
      "Demo mode mirrors the production path: chunk first, summarize compact context, and cite retrieved sections.",
  };
}

export function demoInsights(chunks: DocumentChunk[]): InsightsOutput {
  const citation = chunks[0] ? citationFromChunk(chunks[0]) : undefined;

  return {
    keyFindings: [
      {
        finding:
          "Research systems become more valuable when they extract structured knowledge, not just prose summaries.",
        evidence: citation?.quote ?? "The document emphasizes reusable outputs.",
        confidence: "high",
        citation,
      },
      {
        finding:
          "Token optimization is a product requirement for long-document workflows.",
        evidence:
          "Chunking, compression, caching, and selective context injection are all part of the pipeline.",
        confidence: "high",
      },
    ],
    entities: [
      {
        name: "Supabase",
        type: "Platform",
        relevance: "Storage, auth, relational metadata, and pgvector retrieval.",
      },
      {
        name: "ResearchOS",
        type: "Product",
        relevance: "The intelligence workspace generated from uploaded documents.",
      },
    ],
    claims: [
      {
        claim:
          "RAG reduces hallucination risk by constraining answers to relevant chunks.",
        evidence: citation?.quote ?? "Relevant chunks are cited in answers.",
        citation,
      },
    ],
    contradictions: [],
    gaps: [
      "Scanned PDFs may require OCR in a future version.",
      "Team collaboration and billing are out of scope for this portfolio build.",
    ],
  };
}

export function demoKeywords(): KeywordsOutput {
  return {
    rankedKeywords: [
      {
        keyword: "document intelligence",
        score: 0.96,
        rationale: "Central concept across ingestion, extraction, and reuse.",
      },
      {
        keyword: "RAG-lite retrieval",
        score: 0.92,
        rationale: "Core Q&A grounding mechanism.",
      },
      {
        keyword: "token optimization",
        score: 0.89,
        rationale: "Explicit performance and cost theme.",
      },
    ],
    topicClusters: [
      {
        label: "AI research workflow",
        keywords: ["summarization", "insights", "claims", "evidence"],
        summary: "Structured outputs that make documents reusable.",
      },
      {
        label: "Scalable architecture",
        keywords: ["Supabase", "pgvector", "caching", "storage"],
        summary: "Backend pieces needed for a SaaS-style research workspace.",
      },
    ],
    semanticTags: ["ai-research", "rag", "supabase", "document-processing"],
  };
}

export function demoAnswer(question: string, hits: RetrievalHit[]): AnswerOutput {
  const citations = hits.slice(0, 3).map(citationFromChunk);

  return {
    answer: `Based on the retrieved document context, the answer is that "${question}" should be handled through a structured research pipeline: chunk the source, retrieve only relevant context, generate a concise answer, and attach citations so the user can verify the claim.`,
    citations,
    confidence: citations.length ? "medium" : "low",
    followUpQuestions: [
      "Which claims need stronger evidence?",
      "What gaps should be tracked as research notes?",
      "Which sections should be exported into the final report?",
    ],
  };
}
