import { z } from "zod";

export const summaryDepthSchema = z.enum(["short", "detailed", "executive"]);

export const citationSchema = z.object({
  chunkId: z.string(),
  chunkIndex: z.number(),
  documentId: z.string().nullable().optional(),
  documentTitle: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  projectTitle: z.string().nullable().optional(),
  sectionTitle: z.string().nullable().optional(),
  pageStart: z.number().nullable().optional(),
  pageEnd: z.number().nullable().optional(),
  quote: z.string(),
  similarity: z.number().optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
});

export const summarySchema = z.object({
  depth: summaryDepthSchema,
  title: z.string(),
  abstract: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
    }),
  ),
  keyTakeaways: z.array(z.string()),
  citations: z.array(citationSchema),
  tokenStrategy: z.string(),
});

export const insightsSchema = z.object({
  keyFindings: z.array(
    z.object({
      finding: z.string(),
      evidence: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
      citation: citationSchema.optional(),
    }),
  ),
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      relevance: z.string(),
    }),
  ),
  claims: z.array(
    z.object({
      claim: z.string(),
      evidence: z.string(),
      citation: citationSchema.optional(),
    }),
  ),
  contradictions: z.array(
    z.object({
      issue: z.string(),
      whyItMatters: z.string(),
      citation: citationSchema.optional(),
    }),
  ),
  gaps: z.array(z.string()),
});

export const keywordsSchema = z.object({
  rankedKeywords: z.array(
    z.object({
      keyword: z.string(),
      score: z.number(),
      rationale: z.string(),
    }),
  ),
  topicClusters: z.array(
    z.object({
      label: z.string(),
      keywords: z.array(z.string()),
      summary: z.string(),
    }),
  ),
  semanticTags: z.array(z.string()),
});

export const answerSchema = z.object({
  answer: z.string(),
  citations: z.array(citationSchema),
  confidence: z.enum(["low", "medium", "high"]),
  followUpQuestions: z.array(z.string()),
});

export const synthesisReportKindSchema = z.enum([
  "combined_summary",
  "source_comparison",
  "executive_brief",
  "trend_analysis",
  "research_gaps",
  "contradiction_analysis",
  "opportunity_analysis",
  "key_takeaways",
  "recommendation_summary",
]);

export const synthesisReportSchema = z.object({
  kind: synthesisReportKindSchema,
  title: z.string(),
  overview: z.string(),
  combinedSummary: z.string(),
  sourceComparisons: z.array(
    z.object({
      source: z.string(),
      contribution: z.string(),
      notableDifference: z.string(),
    }),
  ),
  overlappingIdeas: z.array(z.string()),
  keyThemes: z.array(z.string()).default([]),
  sharedClaims: z.array(z.string()).default([]),
  conflictingPoints: z.array(z.string()).default([]),
  recommendedNextQuestions: z.array(z.string()).default([]),
  opportunities: z.array(z.string()).default([]),
  keyTakeaways: z.array(z.string()).default([]),
  sourceTensions: z.array(
    z.object({
      topic: z.string(),
      explanation: z.string(),
      citations: z.array(citationSchema),
    }),
  ),
  recommendations: z.array(z.string()),
  citations: z.array(citationSchema),
  confidence: z.enum(["low", "medium", "high"]),
});

export const knowledgeExtractionSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      summary: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
      mentions: z.number().int().min(1),
    }),
  ),
  linkedInsights: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      category: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
      citations: z.array(citationSchema),
    }),
  ),
  claims: z.array(
    z.object({
      claim: z.string(),
      evidence: z.string(),
      stance: z.enum(["supports", "challenges", "neutral"]),
      confidence: z.enum(["low", "medium", "high"]),
      citations: z.array(citationSchema),
    }),
  ),
  relationships: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      relation: z.string(),
      strength: z.number().min(0).max(1),
      evidence: z.string(),
    }),
  ),
});

export type SummaryOutput = z.infer<typeof summarySchema>;
export type InsightsOutput = z.infer<typeof insightsSchema>;
export type KeywordsOutput = z.infer<typeof keywordsSchema>;
export type AnswerOutput = z.infer<typeof answerSchema>;
export type SynthesisReportOutput = z.infer<typeof synthesisReportSchema>;
export type KnowledgeExtractionOutput = z.infer<typeof knowledgeExtractionSchema>;
