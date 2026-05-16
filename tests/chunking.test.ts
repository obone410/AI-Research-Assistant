import { describe, expect, it } from "vitest";
import {
  chunkDocument,
  compactForPrompt,
  estimateTokens,
  normalizeDocumentText,
} from "@/lib/documents/chunk";

describe("document chunking", () => {
  it("normalizes whitespace and estimates tokens", () => {
    expect(normalizeDocumentText("A  test\r\n\r\n\r\nB")).toBe("A test\n\nB");
    expect(estimateTokens("abcd efgh")).toBeGreaterThan(1);
  });

  it("chunks long documents with stable indexes and overlap", () => {
    const text = Array.from({ length: 30 }, (_, index) => {
      return `Section ${index}\n\nThis paragraph contains research evidence about retrieval, summarization, and citations for index ${index}.`;
    }).join("\n\n");

    const chunks = chunkDocument({
      text,
      targetTokens: 80,
      overlapTokens: 12,
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(
      chunks.map((_, index) => index),
    );
    expect(chunks[0].contentHash).toHaveLength(64);
  });

  it("compacts very long prompt context", () => {
    const text = "research ".repeat(4000);
    const compacted = compactForPrompt(text, 400);

    expect(compacted.length).toBeLessThan(text.length);
    expect(compacted).toContain("middle compressed");
  });
});
