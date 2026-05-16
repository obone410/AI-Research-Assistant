type PromptVariables = Record<string, string | number>;

export type PromptTemplate = {
  id: string;
  version: "v1";
  description: string;
  temperature: number;
  maxTokens: number;
  template: string;
};

export const promptTemplates = {
  summarizeChunk: {
    id: "summarization.chunk",
    version: "v1",
    description: "Compress one source chunk into reusable research notes.",
    temperature: 0.2,
    maxTokens: 700,
    template: `You are ResearchOS, a precise research intelligence engine.
Summarize the document chunk below into compact, citation-ready notes.

Return JSON with:
{
  "chunkIndex": {{chunkIndex}},
  "sectionTitle": "{{sectionTitle}}",
  "summary": "dense paragraph",
  "keyPoints": ["point"],
  "evidence": ["short quoted evidence"]
}

Chunk:
{{chunk}}`,
  },
  summarizeDocument: {
    id: "summarization.document",
    version: "v1",
    description: "Create the final hierarchical document summary.",
    temperature: 0.25,
    maxTokens: 1600,
    template: `You are ResearchOS. Generate a {{depth}} research summary from compressed chunk notes.
Prefer faithful synthesis over generic prose. Cite chunks using their chunk index when useful.

Return only JSON matching this shape:
{
  "depth": "{{depth}}",
  "title": "clear document title",
  "abstract": "one strong overview paragraph",
  "sections": [{"heading": "section", "content": "analysis"}],
  "keyTakeaways": ["takeaway"],
  "citations": [{"chunkId":"unknown","chunkIndex":0,"sectionTitle":null,"quote":"supporting quote"}],
  "tokenStrategy": "brief explanation of chunking/compression used"
}

Compressed chunk notes:
{{chunkSummaries}}`,
  },
  extractInsights: {
    id: "extraction.insights",
    version: "v1",
    description: "Extract findings, entities, claims, contradictions, and gaps.",
    temperature: 0.15,
    maxTokens: 1800,
    template: `You are ResearchOS. Extract structured research intelligence from the context.
Focus on claims, evidence, contradictions, and missing information. Be specific.

Return only JSON:
{
  "keyFindings": [{"finding":"", "evidence":"", "confidence":"high"}],
  "entities": [{"name":"", "type":"", "relevance":""}],
  "claims": [{"claim":"", "evidence":""}],
  "contradictions": [{"issue":"", "whyItMatters":""}],
  "gaps": [""]
}

Context:
{{text}}`,
  },
  generateKeywords: {
    id: "extraction.keywords",
    version: "v1",
    description: "Rank keywords and produce semantic topic clusters.",
    temperature: 0.1,
    maxTokens: 1200,
    template: `You are ResearchOS. Generate ranked keywords, topic clusters, and semantic tags.
Avoid filler tags. Prefer phrases a researcher would use to retrieve this work later.

Return only JSON:
{
  "rankedKeywords": [{"keyword":"", "score": 0.9, "rationale": ""}],
  "topicClusters": [{"label":"", "keywords":[""], "summary": ""}],
  "semanticTags": [""]
}

Context:
{{text}}`,
  },
  answerQuestion: {
    id: "qa.document",
    version: "v1",
    description: "Answer a question from retrieved chunks with citations.",
    temperature: 0.2,
    maxTokens: 1300,
    template: `You are ResearchOS. Answer the question using only the retrieved document context.
If the context is insufficient, say what cannot be determined. Cite relevant chunks.

Return only JSON:
{
  "answer": "",
  "citations": [{"chunkId":"", "chunkIndex":0, "sectionTitle":null, "quote":""}],
  "confidence": "medium",
  "followUpQuestions": [""]
}

Question:
{{question}}

Retrieved context:
{{context}}`,
  },
} satisfies Record<string, PromptTemplate>;

export function renderPrompt(
  template: PromptTemplate,
  variables: PromptVariables,
) {
  return template.template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}
