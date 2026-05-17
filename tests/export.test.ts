import { describe, expect, it } from "vitest";
import {
  buildCollectionJsonReport,
  buildCollectionMarkdownReport,
  buildJsonReport,
  buildMarkdownReport,
} from "@/lib/research/export";
import type { CollectionDetail, ProjectDetail } from "@/lib/research/types";

const project: ProjectDetail = {
  id: "project-1",
  title: "Portfolio Research",
  description: null,
  status: "ready",
  documentCount: 1,
  createdAt: "2026-05-16T00:00:00.000Z",
  updatedAt: "2026-05-16T00:00:00.000Z",
  documents: [
    {
      id: "doc-1",
      projectId: "project-1",
      fileName: "brief.txt",
      fileType: "text/plain",
      fileSize: 120,
      contentHash: "hash",
      rawText: "Research content",
      charCount: 16,
      tokenCount: 4,
      chunkCount: 1,
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  chunks: [],
  outputs: {
    summary: { abstract: "Strong summary." },
    insights: { keyFindings: [] },
    keywords: { semanticTags: ["rag"] },
  },
  notes: [
    {
      id: "note-1",
      title: "Angle",
      body: "Make it recruiter-grade.",
      sourceType: "manual",
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  highlights: [],
  qa: [
    {
      id: "qa-1",
      question: "Why is this useful?",
      answer: "It demonstrates architecture.",
      citations: [
        {
          chunkId: "chunk-1",
          chunkIndex: 0,
          quote: "Architecture evidence.",
        },
      ],
      provider: "demo",
      model: "demo",
      pinned: true,
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  pipelineRuns: [],
};

const collection: CollectionDetail = {
  id: "collection-1",
  name: "AI Research Collection",
  description: null,
  projectCount: 1,
  documentCount: 1,
  createdAt: "2026-05-16T00:00:00.000Z",
  updatedAt: "2026-05-16T00:00:00.000Z",
  documents: [
    {
      id: "collection-document-1",
      collectionId: "collection-1",
      projectId: "project-1",
      documentId: "doc-1",
      projectTitle: "Portfolio Research",
      fileName: "brief.txt",
      addedAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  notes: [
    {
      id: "collection-note-1",
      collectionId: "collection-1",
      title: "Synthesis note",
      body: "Compare overlapping source claims.",
      sourceType: "manual",
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  reports: [
    {
      id: "report-1",
      collectionId: "collection-1",
      kind: "combined_summary",
      title: "Unified report",
      output: { overview: "Collection overview." },
      citations: [
        {
          chunkId: "chunk-1",
          chunkIndex: 0,
          quote: "Collection evidence.",
        },
      ],
      provider: "demo",
      model: "demo",
      tokenEstimate: 0,
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  entities: [
    {
      id: "entity-1",
      collectionId: "collection-1",
      projectId: null,
      name: "ResearchOS",
      type: "Product",
      summary: "Research workspace.",
      confidence: "high",
      mentions: 2,
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  documentEntities: [
    {
      id: "document-entity-1",
      collectionId: "collection-1",
      projectId: "project-1",
      documentId: "doc-1",
      entityId: "entity-1",
      entityName: "ResearchOS",
      entityType: "Product",
      context: "Mentioned in the brief.",
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  relationships: [
    {
      id: "relationship-1",
      collectionId: "collection-1",
      sourceEntityId: "entity-1",
      targetEntityId: "entity-2",
      sourceName: "ResearchOS",
      targetName: "Reusable memory",
      relation: "supports",
      strength: 0.84,
      evidence: "The collection keeps outputs reusable.",
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  insights: [
    {
      id: "insight-1",
      collectionId: "collection-1",
      projectId: null,
      title: "Reusable memory",
      body: "Insights are reusable across reports.",
      category: "workflow",
      confidence: "high",
      citations: [],
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  claims: [
    {
      id: "claim-1",
      collectionId: "collection-1",
      projectId: null,
      claim: "Collection synthesis improves research reuse.",
      evidence: "Unified reports combine source outputs.",
      stance: "supports",
      confidence: "high",
      citations: [],
      createdAt: "2026-05-16T00:00:00.000Z",
    },
  ],
  qa: [],
  pipelineRuns: [],
  sessions: [],
};

describe("report export", () => {
  it("builds markdown reports with pinned Q&A and citations", () => {
    const markdown = buildMarkdownReport(project);

    expect(markdown).toContain("# Portfolio Research");
    expect(markdown).toContain("Why is this useful?");
    expect(markdown).toContain("Chunk 0");
  });

  it("builds structured JSON reports", () => {
    const json = JSON.parse(buildJsonReport(project));

    expect(json.project.title).toBe("Portfolio Research");
    expect(json.citations[0].quote).toBe("Architecture evidence.");
  });

  it("builds collection markdown exports", () => {
    const markdown = buildCollectionMarkdownReport(collection);

    expect(markdown).toContain("# AI Research Collection");
    expect(markdown).toContain("Unified report");
    expect(markdown).toContain("Synthesis note");
    expect(markdown).toContain("ResearchOS");
    expect(markdown).toContain("Concept Links");
  });

  it("builds collection JSON exports", () => {
    const json = JSON.parse(buildCollectionJsonReport(collection));

    expect(json.collection.name).toBe("AI Research Collection");
    expect(json.citations[0].quote).toBe("Collection evidence.");
    expect(json.relationships[0].relation).toBe("supports");
  });
});
