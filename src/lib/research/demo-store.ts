import { randomUUID } from "node:crypto";
import { chunkDocument } from "@/lib/documents/chunk";
import type {
  Citation,
  CachedQaResponse,
  CollectionDetail,
  CollectionDocument,
  CollectionNote,
  CollectionQaMessage,
  DocumentEntity,
  EntityRelationship,
  Highlight,
  KnowledgeEntity,
  LinkedInsight,
  ProjectDetail,
  QaMessage,
  ResearchClaim,
  ResearchCollection,
  ResearchDocument,
  ResearchNote,
  ResearchProject,
  ResearchPipelineRun,
  ResearchSession,
  ResearchSessionFinding,
  SynthesisReport,
  SynthesisReportKind,
  UsageAnalytics,
  UsageMetric,
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
  collections: ResearchCollection[];
  collectionDocuments: CollectionDocument[];
  collectionNotes: CollectionNote[];
  synthesisReports: SynthesisReport[];
  entities: KnowledgeEntity[];
  linkedInsights: LinkedInsight[];
  claims: ResearchClaim[];
  collectionQa: CollectionQaMessage[];
  pipelineRuns: ResearchPipelineRun[];
  sessions: ResearchSession[];
  sessionFindings: ResearchSessionFinding[];
  metrics: UsageMetric[];
  documentEntities: DocumentEntity[];
  relationships: EntityRelationship[];
  qaCache: Map<string, CachedQaResponse>;
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

function createSeedStore(): DemoState {
  const project = createSeedProject();
  const now = new Date().toISOString();
  const collection: ResearchCollection = {
    id: "demo-collection",
    name: "AI Research Intelligence Workspace",
    description: "A demo collection for multi-document synthesis workflows.",
    projectCount: 1,
    documentCount: 1,
    createdAt: now,
    updatedAt: now,
  };

  return {
    projects: [project],
    outputs: [],
    collections: [collection],
    collectionDocuments: [
      {
        id: "demo-collection-document",
        collectionId: collection.id,
        projectId: project.id,
        documentId: project.documents[0]?.id ?? null,
        projectTitle: project.title,
        fileName: project.documents[0]?.fileName ?? null,
        addedAt: now,
      },
    ],
    collectionNotes: [
      {
        id: "demo-collection-note",
        collectionId: collection.id,
        title: "Collection research angle",
        body: "Compare sources around retrieval, citations, and reusable research memory.",
        sourceType: "manual",
        createdAt: now,
      },
    ],
    synthesisReports: [],
    entities: [],
    documentEntities: [],
    relationships: [],
    qaCache: new Map(),
    linkedInsights: [],
    claims: [],
    collectionQa: [],
    pipelineRuns: [
      {
        id: "demo-pipeline-run",
        collectionId: collection.id,
        projectId: null,
        name: "Demo research pipeline",
        status: "complete",
        createdAt: now,
        completedAt: now,
        steps: [
          {
            id: "demo-step-upload",
            runId: "demo-pipeline-run",
            name: "Upload",
            status: "complete",
            detail: "Demo source loaded.",
            startedAt: now,
            completedAt: now,
          },
          {
            id: "demo-step-analyze",
            runId: "demo-pipeline-run",
            name: "Analyze",
            status: "complete",
            detail: "Chunks prepared for AI workflows.",
            startedAt: now,
            completedAt: now,
          },
        ],
      },
    ],
    sessions: [
      {
        id: "demo-research-session",
        collectionId: collection.id,
        projectId: null,
        title: "Demo investigation session",
        status: "saved",
        summary:
          "Tracks the collection's reusable research memory, open questions, and citation-backed follow-ups.",
        memory: {
          focus: "AI research workspace maturity",
          lastQuestion: "Which gaps should be investigated next?",
        },
        createdAt: now,
        updatedAt: now,
        findings: [],
      },
    ],
    sessionFindings: [
      {
        id: "demo-session-finding",
        sessionId: "demo-research-session",
        findingType: "gap",
        title: "Evidence depth needs follow-up",
        body:
          "The session should compare source-level evidence before turning generated claims into final briefing material.",
        citations: [],
        confidence: "medium",
        createdAt: now,
      },
    ],
    metrics: [
      {
        id: "demo-metric",
        action: "demo.workspace",
        provider: "demo",
        model: "demo",
        tokenEstimate: 0,
        latencyMs: 140,
        chunkCount: project.chunks.length,
        createdAt: now,
      },
    ],
  };
}

export function getDemoStore() {
  if (!globalWithDemoStore.__researchOsDemoStore) {
    globalWithDemoStore.__researchOsDemoStore = createSeedStore();
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

export function listDemoCollections(): ResearchCollection[] {
  return getDemoStore().collections;
}

export function getDemoCollection(collectionId: string): CollectionDetail {
  const store = getDemoStore();
  const collection =
    store.collections.find((item) => item.id === collectionId) ??
    store.collections[0];

  return {
    ...collection,
    documents: store.collectionDocuments.filter(
      (item) => item.collectionId === collection.id,
    ),
    notes: store.collectionNotes
      .filter((item) => item.collectionId === collection.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    reports: store.synthesisReports
      .filter((item) => item.collectionId === collection.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    entities: store.entities.filter((item) => item.collectionId === collection.id),
    documentEntities: store.documentEntities.filter(
      (item) => item.collectionId === collection.id,
    ),
    relationships: store.relationships.filter(
      (item) => item.collectionId === collection.id,
    ),
    insights: store.linkedInsights.filter(
      (item) => item.collectionId === collection.id,
    ),
    claims: store.claims.filter((item) => item.collectionId === collection.id),
    qa: store.collectionQa
      .filter((item) => item.collectionId === collection.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    pipelineRuns: store.pipelineRuns.filter(
      (item) => item.collectionId === collection.id,
    ),
    sessions: store.sessions
      .filter((item) => item.collectionId === collection.id)
      .map((session) => ({
        ...session,
        findings: store.sessionFindings
          .filter((finding) => finding.sessionId === session.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}

export function createDemoCollection(name: string, description?: string | null) {
  const now = new Date().toISOString();
  const collection: ResearchCollection = {
    id: randomUUID(),
    name,
    description: description ?? null,
    projectCount: 0,
    documentCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  getDemoStore().collections.unshift(collection);
  return collection;
}

export function attachDemoProjectToCollection(
  collectionId: string,
  projectId: string,
) {
  const store = getDemoStore();
  const collection = store.collections.find((item) => item.id === collectionId);
  const project = getDemoProject(projectId);

  if (!collection || !project) {
    return null;
  }

  const existing = store.collectionDocuments.find(
    (item) => item.collectionId === collectionId && item.projectId === projectId,
  );

  if (existing) {
    return existing;
  }

  const link: CollectionDocument = {
    id: randomUUID(),
    collectionId,
    projectId,
    documentId: project.documents[0]?.id ?? null,
    projectTitle: project.title,
    fileName: project.documents[0]?.fileName ?? null,
    addedAt: new Date().toISOString(),
  };

  store.collectionDocuments.unshift(link);
  const docs = store.collectionDocuments.filter(
    (item) => item.collectionId === collectionId,
  );
  collection.projectCount = docs.length;
  collection.documentCount = docs.length;
  collection.updatedAt = new Date().toISOString();

  return link;
}

export function removeDemoCollectionDocument(
  collectionId: string,
  input: {
    linkId?: string | null;
    projectId?: string | null;
    documentId?: string | null;
  },
) {
  const store = getDemoStore();
  const before = store.collectionDocuments.length;
  store.collectionDocuments = store.collectionDocuments.filter((item) => {
    if (item.collectionId !== collectionId) {
      return true;
    }

    if (input.linkId) {
      return item.id !== input.linkId;
    }

    if (input.projectId) {
      return item.projectId !== input.projectId;
    }

    if (input.documentId) {
      return item.documentId !== input.documentId;
    }

    return true;
  });

  const collection = store.collections.find((item) => item.id === collectionId);
  if (collection) {
    const count = store.collectionDocuments.filter(
      (item) => item.collectionId === collectionId,
    ).length;
    collection.projectCount = count;
    collection.documentCount = count;
    collection.updatedAt = new Date().toISOString();
  }

  return store.collectionDocuments.length < before;
}

export function addDemoCollectionNote(
  collectionId: string,
  body: string,
  title?: string,
) {
  const note: CollectionNote = {
    id: randomUUID(),
    collectionId,
    title: title || "Collection note",
    body,
    sourceType: "manual",
    createdAt: new Date().toISOString(),
  };

  getDemoStore().collectionNotes.unshift(note);
  return note;
}

export function getDemoCollectionChunks(collectionId: string) {
  const links = getDemoStore().collectionDocuments.filter(
    (item) => item.collectionId === collectionId,
  );

  return links.flatMap((link) => {
    const project = getDemoProject(link.projectId);
    return project.chunks.map((chunk) => ({
      ...chunk,
      similarity: 0,
      documentTitle: link.fileName ?? project.documents[0]?.fileName ?? null,
      projectTitle: project.title,
    }));
  });
}

export function saveDemoSynthesisReport(input: {
  collectionId: string;
  kind: SynthesisReportKind;
  title: string;
  output: unknown;
  citations: Citation[];
  provider: string;
  model: string;
  tokenEstimate: number;
}) {
  const report: SynthesisReport = {
    id: randomUUID(),
    collectionId: input.collectionId,
    kind: input.kind,
    title: input.title,
    output: input.output,
    citations: input.citations,
    provider: input.provider,
    model: input.model,
    tokenEstimate: input.tokenEstimate,
    createdAt: new Date().toISOString(),
  };

  getDemoStore().synthesisReports.unshift(report);
  return report;
}

export function saveDemoKnowledge(input: {
  collectionId: string;
  entities: Array<Omit<KnowledgeEntity, "id" | "createdAt" | "collectionId">>;
  insights: Array<Omit<LinkedInsight, "id" | "createdAt" | "collectionId">>;
  claims: Array<Omit<ResearchClaim, "id" | "createdAt" | "collectionId">>;
  relationships?: Array<{
    source: string;
    target: string;
    relation: string;
    strength: number;
    evidence?: string | null;
  }>;
}) {
  const store = getDemoStore();
  const now = new Date().toISOString();

  store.entities = store.entities.filter(
    (item) => item.collectionId !== input.collectionId,
  );
  store.documentEntities = store.documentEntities.filter(
    (item) => item.collectionId !== input.collectionId,
  );
  store.relationships = store.relationships.filter(
    (item) => item.collectionId !== input.collectionId,
  );
  store.linkedInsights = store.linkedInsights.filter(
    (item) => item.collectionId !== input.collectionId,
  );
  store.claims = store.claims.filter(
    (item) => item.collectionId !== input.collectionId,
  );

  const entities = input.entities.map((entity) => ({
    ...entity,
    id: randomUUID(),
    collectionId: input.collectionId,
    createdAt: now,
  }));
  const insights = input.insights.map((insight) => ({
    ...insight,
    id: randomUUID(),
    collectionId: input.collectionId,
    createdAt: now,
  }));
  const claims = input.claims.map((claim) => ({
    ...claim,
    id: randomUUID(),
    collectionId: input.collectionId,
    createdAt: now,
  }));
  const entityByName = new Map(
    entities.map((entity) => [entity.name.toLowerCase(), entity]),
  );
  const collectionDocuments = store.collectionDocuments.filter(
    (item) => item.collectionId === input.collectionId,
  );
  const documentEntities = collectionDocuments.flatMap((document) =>
    entities.map((entity) => ({
      id: randomUUID(),
      collectionId: input.collectionId,
      projectId: document.projectId,
      documentId: document.documentId ?? null,
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      context: `Mentioned in ${document.projectTitle}.`,
      createdAt: now,
    })),
  );
  const relationships = (input.relationships ?? [])
    .flatMap((relationship): EntityRelationship[] => {
      const source = entityByName.get(relationship.source.toLowerCase());
      const target = entityByName.get(relationship.target.toLowerCase());

      if (!source || !target || source.id === target.id) {
        return [];
      }

      return [
        {
          id: randomUUID(),
          collectionId: input.collectionId,
          sourceEntityId: source.id,
          targetEntityId: target.id,
          sourceName: source.name,
          targetName: target.name,
          relation: relationship.relation,
          strength: relationship.strength,
          evidence: relationship.evidence ?? null,
          createdAt: now,
        },
      ];
    });

  store.entities.unshift(...entities);
  store.documentEntities.unshift(...documentEntities);
  store.relationships.unshift(...relationships);
  store.linkedInsights.unshift(...insights);
  store.claims.unshift(...claims);

  return { entities, documentEntities, relationships, insights, claims };
}

export function addDemoCollectionQa(
  collectionId: string,
  question: string,
  answer: string,
  citations: Citation[],
  provider = "demo",
  model = "demo",
) {
  const message: CollectionQaMessage = {
    id: randomUUID(),
    collectionId,
    question,
    answer,
    citations,
    provider,
    model,
    pinned: false,
    createdAt: new Date().toISOString(),
  };
  getDemoStore().collectionQa.unshift(message);
  return message;
}

export function addDemoUsageMetric(input: Omit<UsageMetric, "id" | "createdAt">) {
  const metric: UsageMetric = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  getDemoStore().metrics.unshift(metric);
  return metric;
}

export function getDemoCachedQa(key: string) {
  return getDemoStore().qaCache.get(key);
}

export function saveDemoCachedQa(key: string, value: CachedQaResponse) {
  getDemoStore().qaCache.set(key, value);
}

export function createDemoPipelineRun(input: {
  collectionId?: string | null;
  projectId?: string | null;
  name: string;
  steps: string[];
}) {
  const now = new Date().toISOString();
  const run: ResearchPipelineRun = {
    id: randomUUID(),
    collectionId: input.collectionId ?? null,
    projectId: input.projectId ?? null,
    name: input.name,
    status: "complete",
    createdAt: now,
    completedAt: now,
    steps: input.steps.map((step) => ({
      id: randomUUID(),
      runId: "demo-run",
      name: step,
      status: "complete",
      detail: `${step} completed in demo mode.`,
      startedAt: now,
      completedAt: now,
    })),
  };

  run.steps = run.steps.map((step) => ({ ...step, runId: run.id }));
  getDemoStore().pipelineRuns.unshift(run);
  return run;
}

export function createDemoResearchSession(input: {
  collectionId?: string | null;
  projectId?: string | null;
  title: string;
  summary?: string | null;
  memory?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();
  const session: ResearchSession = {
    id: randomUUID(),
    collectionId: input.collectionId ?? null,
    projectId: input.projectId ?? null,
    title: input.title,
    status: "saved",
    summary: input.summary ?? null,
    memory: input.memory ?? {},
    createdAt: now,
    updatedAt: now,
    findings: [],
  };

  getDemoStore().sessions.unshift(session);
  return session;
}

export function getDemoUsageAnalytics(): UsageAnalytics {
  const metrics = getDemoStore().metrics;
  const totalTokens = metrics.reduce((sum, metric) => sum + metric.tokenEstimate, 0);
  const totalLatency = metrics.reduce((sum, metric) => sum + metric.latencyMs, 0);
  const byProvider = new Map<string, UsageMetric[]>();

  for (const metric of metrics) {
    byProvider.set(metric.provider, [
      ...(byProvider.get(metric.provider) ?? []),
      metric,
    ]);
  }

  return {
    totalTokens,
    totalRuns: metrics.length,
    averageLatencyMs: metrics.length ? Math.round(totalLatency / metrics.length) : 0,
    retrievalEfficiency: 0.78,
    providerBreakdown: Array.from(byProvider.entries()).map(
      ([provider, providerMetrics]) => ({
        provider,
        runs: providerMetrics.length,
        tokens: providerMetrics.reduce(
          (sum, metric) => sum + metric.tokenEstimate,
          0,
        ),
        averageLatencyMs: Math.round(
          providerMetrics.reduce((sum, metric) => sum + metric.latencyMs, 0) /
            providerMetrics.length,
        ),
      }),
    ),
    recentMetrics: metrics.slice(0, 12),
  };
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
