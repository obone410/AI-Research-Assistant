import { sha256 } from "@/lib/research/hash";

export type ChunkInput = {
  text: string;
  targetTokens?: number;
  overlapTokens?: number;
};

export type PreparedChunk = {
  chunkIndex: number;
  sectionTitle: string | null;
  content: string;
  tokenCount: number;
  contentHash: string;
};

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

export function normalizeDocumentText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkDocument({
  text,
  targetTokens = 900,
  overlapTokens = 120,
}: ChunkInput): PreparedChunk[] {
  const normalized = normalizeDocumentText(text);
  if (!normalized) {
    return [];
  }

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: PreparedChunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;
  let activeSection: string | null = null;

  const flush = () => {
    if (!current.length) {
      return;
    }

    const content = current.join("\n\n").trim();
    chunks.push({
      chunkIndex: chunks.length,
      sectionTitle: activeSection,
      content,
      tokenCount: estimateTokens(content),
      contentHash: sha256(content),
    });

    const overlap: string[] = [];
    let overlapCount = 0;

    for (let index = current.length - 1; index >= 0; index -= 1) {
      const candidate = current[index];
      const candidateTokens = estimateTokens(candidate);

      if (overlapCount + candidateTokens > overlapTokens) {
        break;
      }

      overlap.unshift(candidate);
      overlapCount += candidateTokens;
    }

    current = overlap;
    currentTokens = overlapCount;
  };

  for (const paragraph of paragraphs) {
    const isLikelyHeading =
      paragraph.length <= 96 &&
      !paragraph.endsWith(".") &&
      /^[A-Z0-9][A-Za-z0-9\s:;,\-()]+$/.test(paragraph);

    if (isLikelyHeading) {
      activeSection = paragraph;
    }

    const paragraphTokens = estimateTokens(paragraph);

    if (paragraphTokens > targetTokens) {
      flush();
      const words = paragraph.split(/\s+/);
      let slice: string[] = [];
      let sliceTokens = 0;

      for (const word of words) {
        const wordTokens = estimateTokens(word);

        if (sliceTokens + wordTokens > targetTokens && slice.length) {
          const content = slice.join(" ");
          chunks.push({
            chunkIndex: chunks.length,
            sectionTitle: activeSection,
            content,
            tokenCount: estimateTokens(content),
            contentHash: sha256(content),
          });
          slice = slice.slice(Math.max(0, slice.length - 24));
          sliceTokens = estimateTokens(slice.join(" "));
        }

        slice.push(word);
        sliceTokens += wordTokens;
      }

      if (slice.length) {
        current = [slice.join(" ")];
        currentTokens = estimateTokens(current[0]);
      }

      continue;
    }

    if (currentTokens + paragraphTokens > targetTokens && current.length) {
      flush();
    }

    current.push(paragraph);
    currentTokens += paragraphTokens;
  }

  flush();

  return chunks.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index,
  }));
}

export function compactForPrompt(text: string, maxTokens = 2800) {
  const normalized = normalizeDocumentText(text);
  const estimated = estimateTokens(normalized);

  if (estimated <= maxTokens) {
    return normalized;
  }

  const charBudget = maxTokens * 4;
  const head = normalized.slice(0, Math.floor(charBudget * 0.62));
  const tail = normalized.slice(-Math.floor(charBudget * 0.28));

  return `${head}\n\n[...middle compressed for token efficiency...]\n\n${tail}`;
}
