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
  synthesizeCollection: {
    id: "synthesis.collection",
    version: "v1",
    description: "Create a multi-source research report from selected chunks.",
    temperature: 0.22,
    maxTokens: 2200,
    template: `You are ResearchOS, an AI-native research workspace.
Synthesize the collection context into a reusable research artifact. Compare sources,
identify overlapping ideas, call out source tensions, preserve citations, and add
research reasoning signals that help the user decide what to investigate next.

Return only JSON:
{
  "kind": "{{kind}}",
  "title": "",
  "overview": "",
  "combinedSummary": "",
  "sourceComparisons": [{"source":"", "contribution":"", "notableDifference":""}],
  "overlappingIdeas": [""],
  "keyThemes": [""],
  "sharedClaims": [""],
  "conflictingPoints": [""],
  "recommendedNextQuestions": [""],
  "opportunities": [""],
  "keyTakeaways": [""],
  "sourceTensions": [{"topic":"", "explanation":"", "citations":[{"chunkId":"", "chunkIndex":0, "quote":""}]}],
  "recommendations": [""],
  "confidenceScore": 0.68,
  "evidenceStrength": "moderate",
  "sourceReliability": [{"source":"", "score":0.75, "rationale":""}],
  "hypotheses": [""],
  "claimValidation": [{"claim":"", "status":"supported", "explanation":"", "citations":[{"chunkId":"", "chunkIndex":0, "quote":""}]}],
  "unansweredQuestions": [""],
  "conflictingEvidence": [{"topic":"", "explanation":"", "citations":[{"chunkId":"", "chunkIndex":0, "quote":""}]}],
  "missingTopics": [""],
  "emergingTrends": [""],
  "suggestedInvestigations": [""],
  "citations": [{"chunkId":"", "chunkIndex":0, "sectionTitle":null, "quote":""}],
  "confidence": "medium"
}

Collection:
{{collectionName}}

Report kind:
{{kind}}

Focus question:
{{focusQuestion}}

Context:
{{context}}`,
  },
  extractKnowledge: {
    id: "extraction.knowledge",
    version: "v1",
    description: "Extract entities, linked insights, and claims from a collection.",
    temperature: 0.12,
    maxTokens: 1900,
    template: `You are ResearchOS. Extract structured research knowledge from the context.
Focus on people, organizations, technologies, concepts, topics, important claims, and source-backed insights.

Return only JSON:
{
  "entities": [{"name":"", "type":"", "summary":"", "confidence":"medium", "mentions":1}],
  "linkedInsights": [{"title":"", "body":"", "category":"", "confidence":"medium", "citations":[{"chunkId":"", "chunkIndex":0, "quote":""}]}],
  "claims": [{"claim":"", "evidence":"", "stance":"neutral", "confidence":"medium", "citations":[{"chunkId":"", "chunkIndex":0, "quote":""}]}],
  "relationships": [{"source":"", "target":"", "relation":"", "strength":0.7, "evidence":""}]
}

Context:
{{context}}`,
  },
  answerCollectionQuestion: {
    id: "qa.collection",
    version: "v1",
    description: "Answer a research question across multiple documents.",
    temperature: 0.2,
    maxTokens: 1500,
    template: `You are ResearchOS. Answer the question using only the retrieved multi-document context.
Connect evidence across sources when possible. If the context is insufficient, say what cannot be determined.

Return only JSON:
{
  "answer": "",
  "citations": [{"chunkId":"", "chunkIndex":0, "sectionTitle":null, "quote":""}],
  "confidence": "medium",
  "followUpQuestions": [""]
}

Question:
{{question}}

Retrieved multi-document context:
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
