import { randomUUID } from "node:crypto";
import { chunkDocument } from "@/lib/documents/chunk";
import type {
  Citation,
  Highlight,
  ProjectDetail,
  QaMessage,
  ResearchDocument,
  ResearchNote,
  ResearchProject,
} from "@/lib/research/types";

type StoredOutput = {
  kind: "summary" | "insights" | "keywords";
  depth?: string | null;
  inputHash: string;
  output: unknown;
};

type DemoState = {
  projects: ProjectDetail[];
  outputs: StoredOutput[];
};

const demoText = `ResearchOS Market Intelligence Brief

Executive Context

AI research workflows are shifting from one-off summarization toward reusable knowledge systems. Teams need document ingestion, reliable citation, structured extraction, and repeatable prompt workflows because research artifacts are reused across memos, diligence notes, market maps, and product strategy.

Key Findings

The highest-value systems combine retrieval with structured extraction. Retrieval reduces hallucination risk by constraining the model to relevant chunks, while extraction turns unstructured documents into entities, claims, evidence, and gaps that can be searched later.

Cost Control

Token cost becomes a product constraint when users upload long PDFs. Effective systems chunk documents, summarize locally at the chunk level, cache unchanged documents using content hashes, and inject only the highest-similarity context into question answering.

Implementation Notes

Supabase can provide authentication, file storage, relational metadata, and pgvector retrieval in one architecture. This makes it suitable for portfolio-grade AI SaaS projects because the system demonstrates both product design and backend architecture.

Risks and Gaps

Document extraction quality varies across PDFs, scanned files, and poorly formatted DOCX files. Production systems should expose processing status, preserve raw text, and make citations visible so users can verify model claims.`;

function createSeedProject(): ProjectDetail {
  const now = new Date().toISOString();
  const projectId = "demo-project";
  const documentId = "demo-document";
  const chunks = chunkDocument({ text: demoText, targetTokens: 180 }).map(
    (chunk) => ({
      id: `demo-chunk-${chunk.chunkIndex}`,
      documentId,
      projectId,
      chunkIndex: chunk.chunkIndex,
      sectionTitle: chunk.sectionTitle,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      pageStart: null,
      pageEnd: null,
    }),
  );

  const document: ResearchDocument = {
    id: documentId,
    projectId,
    fileName: "researchos-market-intelligence.txt",
    fileType: "text/plain",
    fileSize: demoText.length,
    contentHash: "demo-seed",
    rawText: demoText,
    charCount: demoText.length,
    tokenCount: Math.ceil(demoText.length / 4),
    chunkCount: chunks.length,
    createdAt: now,
  };

  return {
    id: projectId,
    title: "ResearchOS Market Intelligence Brief",
    description: "Seed workspace for demo mode.",
    status: "ready",
    documentCount: 1,
    createdAt: now,
    updatedAt: now,
    documents: [document],
    chunks,
    outputs: {},
    notes: [
      {
        id: "demo-note",
        title: "Reusable research angle",
        body: "Position this as an intelligence pipeline: ingestion, retrieval, extraction, notes, and exports.",
        sourceType: "manual",
        createdAt: now,
      },
    ],
    highlights: [],
    qa: [],
  };
}

const globalWithDemoStore = globalThis as typeof globalThis & {
  __researchOsDemoStore?: DemoState;
};

export function getDemoStore() {
  if (!globalWithDemoStore.__researchOsDemoStore) {
    globalWithDemoStore.__researchOsDemoStore = {
      projects: [createSeedProject()],
      outputs: [],
    };
  }

  return globalWithDemoStore.__researchOsDemoStore;
}

export function listDemoProjects(): ResearchProject[] {
  return getDemoStore().projects.map((project) => ({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status,
    documentCount: project.documentCount,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));
}

export function getDemoProject(projectId: string) {
  return (
    getDemoStore().projects.find((project) => project.id === projectId) ??
    getDemoStore().projects[0]
  );
}

export function createDemoProjectFromDocument(input: {
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  contentHash: string;
  rawText: string;
  chunks: Array<{
    chunkIndex: number;
    sectionTitle: string | null;
    content: string;
    tokenCount: number;
  }>;
}) {
  const now = new Date().toISOString();
  const projectId = randomUUID();
  const documentId = randomUUID();
  const detail: ProjectDetail = {
    id: projectId,
    title: input.title,
    description: "Demo-mode research project.",
    status: "ready",
    documentCount: 1,
    createdAt: now,
    updatedAt: now,
    documents: [
      {
        id: documentId,
        projectId,
        fileName: input.fileName,
        fileType: input.fileType,
        fileSize: input.fileSize,
        contentHash: input.contentHash,
        rawText: input.rawText,
        charCount: input.rawText.length,
        tokenCount: Math.ceil(input.rawText.length / 4),
        chunkCount: input.chunks.length,
        createdAt: now,
      },
    ],
    chunks: input.chunks.map((chunk) => ({
      id: randomUUID(),
      documentId,
      projectId,
      chunkIndex: chunk.chunkIndex,
      sectionTitle: chunk.sectionTitle,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      pageStart: null,
      pageEnd: null,
    })),
    outputs: {},
    notes: [],
    highlights: [],
    qa: [],
  };

  getDemoStore().projects.unshift(detail);
  return detail;
}

export function getDemoOutput(
  projectId: string,
  kind: "summary" | "insights" | "keywords",
  inputHash: string,
  depth?: string | null,
) {
  return getDemoStore().outputs.find(
    (output) =>
      output.kind === kind &&
      output.inputHash === inputHash &&
      output.depth === (depth ?? null) &&
      Boolean(getDemoProject(projectId)),
  )?.output;
}

export function saveDemoOutput(input: StoredOutput & { projectId: string }) {
  const store = getDemoStore();
  store.outputs = store.outputs.filter(
    (output) =>
      !(
        output.kind === input.kind &&
        output.inputHash === input.inputHash &&
        output.depth === (input.depth ?? null)
      ),
  );
  store.outputs.push({ ...input, depth: input.depth ?? null });

  const project = getDemoProject(input.projectId);
  project.outputs[input.kind] = input.output;
}

export function addDemoNote(projectId: string, body: string, title?: string) {
  const note: ResearchNote = {
    id: randomUUID(),
    title: title || "Research note",
    body,
    sourceType: "manual",
    createdAt: new Date().toISOString(),
  };
  getDemoProject(projectId).notes.unshift(note);
  return note;
}

export function addDemoHighlight(
  projectId: string,
  quote: string,
  chunkId?: string,
  note?: string,
) {
  const highlight: Highlight = {
    id: randomUUID(),
    quote,
    note,
    chunkId,
    createdAt: new Date().toISOString(),
  };
  getDemoProject(projectId).highlights.unshift(highlight);
  return highlight;
}

export function addDemoQa(
  projectId: string,
  question: string,
  answer: string,
  citations: Citation[],
  provider = "demo",
  model = "demo",
) {
  const message: QaMessage = {
    id: randomUUID(),
    question,
    answer,
    citations,
    provider,
    model,
    pinned: false,
    createdAt: new Date().toISOString(),
  };
  getDemoProject(projectId).qa.unshift(message);
  return message;
}

export function toggleDemoPin(projectId: string, messageId: string) {
  const message = getDemoProject(projectId).qa.find((item) => item.id === messageId);
  if (!message) {
    return null;
  }

  message.pinned = !message.pinned;
  return message;
}
