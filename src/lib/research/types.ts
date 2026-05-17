export type SummaryDepth = "short" | "detailed" | "executive";

export type Citation = {
  chunkId: string;
  chunkIndex: number;
  documentId?: string | null;
  documentTitle?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  sectionTitle?: string | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  quote: string;
  similarity?: number;
  confidence?: "low" | "medium" | "high";
};

export type DocumentChunk = {
  id: string;
  documentId: string;
  projectId: string;
  chunkIndex: number;
  sectionTitle?: string | null;
  content: string;
  tokenCount: number;
  pageStart?: number | null;
  pageEnd?: number | null;
};

export type ResearchDocument = {
  id: string;
  projectId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  contentHash: string;
  rawText: string;
  charCount: number;
  tokenCount: number;
  chunkCount: number;
  createdAt: string;
};

export type ResearchNote = {
  id: string;
  title: string;
  body: string;
  sourceType: string;
  createdAt: string;
};

export type Highlight = {
  id: string;
  quote: string;
  note?: string | null;
  chunkId?: string | null;
  createdAt: string;
};

export type QaMessage = {
  id: string;
  question: string;
  answer: string;
  citations: Citation[];
  provider: string;
  model: string;
  pinned: boolean;
  createdAt: string;
};

export type ResearchProject = {
  id: string;
  title: string;
  description?: string | null;
  status: "processing" | "ready" | "failed";
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectDetail = ResearchProject & {
  documents: ResearchDocument[];
  chunks: DocumentChunk[];
  outputs: {
    summary?: unknown;
    insights?: unknown;
    keywords?: unknown;
  };
  notes: ResearchNote[];
  highlights: Highlight[];
  qa: QaMessage[];
};

export type RetrievalHit = DocumentChunk & {
  similarity: number;
  documentTitle?: string | null;
  projectTitle?: string | null;
};

export type ResearchCollection = {
  id: string;
  name: string;
  description?: string | null;
  projectCount: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CollectionDocument = {
  id: string;
  collectionId: string;
  projectId: string;
  documentId?: string | null;
  projectTitle: string;
  fileName?: string | null;
  addedAt: string;
};

export type SynthesisReportKind =
  | "combined_summary"
  | "source_comparison"
  | "executive_brief"
  | "trend_analysis"
  | "research_gaps";

export type SynthesisReport = {
  id: string;
  collectionId: string;
  kind: SynthesisReportKind;
  title: string;
  output: unknown;
  citations: Citation[];
  provider: string;
  model: string;
  tokenEstimate: number;
  createdAt: string;
};

export type KnowledgeEntity = {
  id: string;
  collectionId?: string | null;
  projectId?: string | null;
  name: string;
  type: string;
  summary: string;
  confidence: "low" | "medium" | "high";
  mentions: number;
  createdAt: string;
};

export type DocumentEntity = {
  id: string;
  collectionId?: string | null;
  projectId?: string | null;
  documentId?: string | null;
  entityId: string;
  entityName: string;
  entityType: string;
  context?: string | null;
  createdAt: string;
};

export type EntityRelationship = {
  id: string;
  collectionId?: string | null;
  sourceEntityId: string;
  targetEntityId: string;
  sourceName: string;
  targetName: string;
  relation: string;
  strength: number;
  evidence?: string | null;
  createdAt: string;
};

export type LinkedInsight = {
  id: string;
  collectionId?: string | null;
  projectId?: string | null;
  title: string;
  body: string;
  category: string;
  confidence: "low" | "medium" | "high";
  citations: Citation[];
  createdAt: string;
};

export type ResearchClaim = {
  id: string;
  collectionId?: string | null;
  projectId?: string | null;
  claim: string;
  evidence: string;
  stance: "supports" | "challenges" | "neutral";
  confidence: "low" | "medium" | "high";
  citations: Citation[];
  createdAt: string;
};

export type CollectionQaMessage = {
  id: string;
  collectionId: string;
  question: string;
  answer: string;
  citations: Citation[];
  provider: string;
  model: string;
  pinned: boolean;
  createdAt: string;
};

export type PipelineStepStatus = "queued" | "running" | "complete" | "failed";

export type ResearchPipelineStep = {
  id: string;
  runId: string;
  name: string;
  status: PipelineStepStatus;
  detail?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type ResearchPipelineRun = {
  id: string;
  collectionId?: string | null;
  projectId?: string | null;
  name: string;
  status: PipelineStepStatus;
  createdAt: string;
  completedAt?: string | null;
  steps: ResearchPipelineStep[];
};

export type UsageMetric = {
  id: string;
  action: string;
  provider: string;
  model: string;
  tokenEstimate: number;
  latencyMs: number;
  chunkCount: number;
  createdAt: string;
};

export type CachedQaResponse = {
  output: unknown;
  provider: string;
  model: string;
  tokenEstimate: number;
  createdAt: string;
};

export type UsageAnalytics = {
  totalTokens: number;
  totalRuns: number;
  averageLatencyMs: number;
  retrievalEfficiency: number;
  providerBreakdown: Array<{
    provider: string;
    runs: number;
    tokens: number;
    averageLatencyMs: number;
  }>;
  recentMetrics: UsageMetric[];
};

export type CollectionDetail = ResearchCollection & {
  documents: CollectionDocument[];
  reports: SynthesisReport[];
  entities: KnowledgeEntity[];
  documentEntities: DocumentEntity[];
  relationships: EntityRelationship[];
  insights: LinkedInsight[];
  claims: ResearchClaim[];
  qa: CollectionQaMessage[];
  pipelineRuns: ResearchPipelineRun[];
};
