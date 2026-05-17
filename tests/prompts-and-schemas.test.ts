import { describe, expect, it } from "vitest";
import {
  knowledgeExtractionSchema,
  summarySchema,
  synthesisReportSchema,
} from "@/lib/ai/schemas";
import { promptTemplates, renderPrompt } from "@/lib/ai/prompts";

describe("prompt templates and output schemas", () => {
  it("renders variable placeholders", () => {
    const prompt = renderPrompt(promptTemplates.answerQuestion, {
      question: "What is the claim?",
      context: "Chunk 1 says the claim is cited.",
    });

    expect(prompt).toContain("What is the claim?");
    expect(prompt).toContain("Chunk 1 says");
    expect(prompt).not.toContain("{{question}}");
  });

  it("validates structured summary output", () => {
    const parsed = summarySchema.parse({
      depth: "detailed",
      title: "Research brief",
      abstract: "A concise abstract.",
      sections: [{ heading: "Findings", content: "Evidence-backed notes." }],
      keyTakeaways: ["Citations matter."],
      citations: [
        {
          chunkId: "chunk-1",
          chunkIndex: 0,
          quote: "A source quote.",
        },
      ],
      tokenStrategy: "Chunked then synthesized.",
    });

    expect(parsed.depth).toBe("detailed");
  });

  it("validates multi-document synthesis output", () => {
    const parsed = synthesisReportSchema.parse({
      kind: "combined_summary",
      title: "Unified report",
      overview: "A collection-level overview.",
      combinedSummary: "The shared research narrative.",
      sourceComparisons: [
        {
          source: "Source A",
          contribution: "Adds the market angle.",
          notableDifference: "Uses a different framing.",
        },
      ],
      overlappingIdeas: ["Retrieval improves grounded answers."],
      sourceTensions: [
        {
          topic: "Cost",
          explanation: "Sources emphasize different cost controls.",
          citations: [
            {
              chunkId: "chunk-1",
              chunkIndex: 0,
              quote: "Token strategy evidence.",
            },
          ],
        },
      ],
      recommendations: ["Export a cited brief."],
      citations: [
        {
          chunkId: "chunk-1",
          chunkIndex: 0,
          quote: "Token strategy evidence.",
        },
      ],
      confidence: "medium",
    });

    expect(parsed.kind).toBe("combined_summary");
  });

  it("validates knowledge extraction output", () => {
    const parsed = knowledgeExtractionSchema.parse({
      entities: [
        {
          name: "ResearchOS",
          type: "Product",
          summary: "Workspace for AI research workflows.",
          confidence: "high",
          mentions: 3,
        },
      ],
      linkedInsights: [
        {
          title: "Reusable outputs matter",
          body: "Research artifacts should remain available after generation.",
          category: "workflow",
          confidence: "high",
          citations: [
            {
              chunkId: "chunk-1",
              chunkIndex: 0,
              quote: "Reusable outputs.",
            },
          ],
        },
      ],
      claims: [
        {
          claim: "Citations improve trust.",
          evidence: "The source links answers back to chunks.",
          stance: "supports",
          confidence: "high",
          citations: [],
        },
      ],
      relationships: [
        {
          source: "ResearchOS",
          target: "Citations",
          relation: "uses",
          strength: 0.8,
          evidence: "The workspace links answers to chunks.",
        },
      ],
    });

    expect(parsed.entities[0].name).toBe("ResearchOS");
  });
});
