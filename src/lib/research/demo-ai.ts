import type {
  AnswerOutput,
  KnowledgeExtractionOutput,
  InsightsOutput,
  KeywordsOutput,
  SynthesisReportOutput,
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

export function demoSynthesis(
  kind: SynthesisReportOutput["kind"],
  collectionName: string,
  hits: RetrievalHit[],
): SynthesisReportOutput {
  const citations = hits.slice(0, 4).map(citationFromChunk);

  return {
    kind,
    title:
      kind === "executive_brief"
        ? `${collectionName} executive brief`
        : `${collectionName} unified research report`,
    overview:
      "The collection points to a research operating system pattern: ingest documents, structure the source material, retrieve the most relevant chunks, and reuse outputs across notes, reports, and chat.",
    combinedSummary:
      "Across the available sources, the strongest shared idea is that document intelligence becomes more useful when summaries, claims, entities, and citations are saved as durable research assets. The workflow also emphasizes cost-aware chunking and selective context so long documents can be analyzed without sending redundant text to the model.",
    sourceComparisons: [
      {
        source: hits[0]?.projectTitle ?? "Primary source",
        contribution:
          "Frames the research workspace as a repeatable pipeline rather than a one-off summarizer.",
        notableDifference:
          "Places more emphasis on product workflow and reusable outputs.",
      },
      {
        source: hits[1]?.projectTitle ?? "Supporting source",
        contribution:
          "Adds operational details around embeddings, citations, and exportable findings.",
        notableDifference:
          "Focuses more on implementation depth and retrieval behavior.",
      },
    ],
    overlappingIdeas: [
      "Chunking and retrieval are central to grounded research answers.",
      "Structured outputs make findings reusable across reports and notes.",
      "Citations improve confidence and make AI outputs easier to verify.",
    ],
    keyThemes: [
      "Citation-first research workflows",
      "Reusable knowledge extraction",
      "Cost-aware retrieval and summarization",
    ],
    sharedClaims: [
      "Research outputs become more valuable when they are saved as reusable assets.",
      "Selective retrieval reduces redundant context and keeps answers grounded.",
    ],
    conflictingPoints: [
      "Fast executive summaries can trade off against slower source-by-source comparison.",
    ],
    recommendedNextQuestions: [
      "Which extracted claims should become saved notes?",
      "Where do the uploaded sources disagree most strongly?",
      "Which themes should be exported into the final briefing?",
    ],
    opportunities: [
      "Use collections as reusable research rooms for market maps and diligence notes.",
      "Turn recurring entity clusters into saved research views.",
    ],
    keyTakeaways: [
      "ResearchOS should feel like a workflow system, not a one-off summarizer.",
      "Collection synthesis is strongest when source citations stay visible.",
    ],
    sourceTensions: [
      {
        topic: "Depth versus speed",
        explanation:
          "Some workflows favor rapid executive summaries while others require slower, source-by-source comparison.",
        citations: citations.slice(0, 2),
      },
    ],
    recommendations: [
      "Use collection reports for recurring research briefs.",
      "Extract entities and claims immediately after ingestion so later chats can reuse them.",
      "Pin high-value answers and include them in exports.",
    ],
    citations,
    confidence: citations.length ? "medium" : "low",
  };
}

export function demoKnowledgeExtraction(
  hits: RetrievalHit[],
): KnowledgeExtractionOutput {
  const citations = hits.slice(0, 3).map(citationFromChunk);

  return {
    entities: [
      {
        name: "ResearchOS",
        type: "Product",
        summary:
          "An AI-native workspace for document ingestion, retrieval, synthesis, and reusable research outputs.",
        confidence: "high",
        mentions: 4,
      },
      {
        name: "Supabase",
        type: "Technology",
        summary:
          "Provides authentication, file storage, Postgres metadata, and pgvector retrieval for the workspace.",
        confidence: "high",
        mentions: 2,
      },
      {
        name: "RAG-lite retrieval",
        type: "Concept",
        summary:
          "A retrieval workflow that selects relevant chunks before generating cited answers.",
        confidence: "high",
        mentions: 3,
      },
    ],
    linkedInsights: [
      {
        title: "Research outputs should become workspace memory",
        body:
          "Summaries, claims, entities, and pinned answers are more valuable when they remain searchable after the first AI run.",
        category: "workflow",
        confidence: "high",
        citations,
      },
      {
        title: "Selective context keeps analysis responsive",
        body:
          "The platform should inject only the most relevant chunks when answering or synthesizing across documents.",
        category: "retrieval",
        confidence: "medium",
        citations: citations.slice(0, 2),
      },
    ],
    claims: [
      {
        claim:
          "A research platform needs citations and reusable structured outputs to feel trustworthy.",
        evidence: citations[0]?.quote ?? "Demo source emphasizes citation-backed outputs.",
        stance: "supports",
        confidence: citations.length ? "high" : "medium",
        citations: citations.slice(0, 1),
      },
    ],
    relationships: [
      {
        source: "ResearchOS",
        target: "RAG-lite retrieval",
        relation: "uses",
        strength: 0.86,
        evidence:
          "The workspace uses retrieval over chunks to generate cited answers and collection reports.",
      },
      {
        source: "ResearchOS",
        target: "Supabase",
        relation: "is implemented with",
        strength: 0.82,
        evidence:
          "Supabase stores documents, metadata, embeddings, and research memory.",
      },
    ],
  };
}
