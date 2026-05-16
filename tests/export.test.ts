import { describe, expect, it } from "vitest";
import { buildJsonReport, buildMarkdownReport } from "@/lib/research/export";
import type { ProjectDetail } from "@/lib/research/types";

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
});
