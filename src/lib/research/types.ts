export type SummaryDepth = "short" | "detailed" | "executive";

export type Citation = {
  chunkId: string;
  chunkIndex: number;
  sectionTitle?: string | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  quote: string;
  similarity?: number;
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
};
