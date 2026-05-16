import { describe, expect, it } from "vitest";
import { summarySchema } from "@/lib/ai/schemas";
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
});
