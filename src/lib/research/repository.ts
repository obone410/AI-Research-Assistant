import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/config";
import { embedText, vectorLiteral } from "@/lib/ai/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addDemoCollectionNote,
  addDemoCollectionQa,
  addDemoHighlight,
  addDemoNote,
  addDemoQa,
  addDemoUsageMetric,
  attachDemoProjectToCollection,
  createDemoProjectFromDocument,
  createDemoCollection,
  createDemoPipelineRun,
  createDemoResearchSession,
  getDemoCollection,
  getDemoCollectionChunks,
  getDemoCachedQa,
  getDemoOutput,
  getDemoProject,
  getDemoUsageAnalytics,
  listDemoProjects,
  listDemoCollections,
  removeDemoCollectionDocument,
  saveDemoOutput,
  saveDemoKnowledge,
  saveDemoCachedQa,
  saveDemoSynthesisReport,
  toggleDemoPin,
} from "@/lib/research/demo-store";
import type {
  Citation,
  CachedQaResponse,
  CollectionDetail,
  CollectionDocument,
  CollectionNote,
  CollectionQaMessage,
  DocumentEntity,
  DocumentChunk,
  EntityRelationship,
  EntityDetail,
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
  ResearchPipelineStep,
  ResearchSession,
  ResearchSessionFinding,
  RetrievalHit,
  SynthesisReport,
  SynthesisReportKind,
  UsageAnalytics,
  UsageMetric,
} from "@/lib/research/types";

type DbRow = Record<string, unknown>;

export type ResearchContext =
  | {
      mode: "demo";
      user: { id: "demo-user"; email: "demo@researchos.local" };
    }
  | {
      mode: "supabase";
      user: { id: string; email: string | null };
      supabase: SupabaseClient;
    };

type CreateProjectInput = {
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  contentHash: string;
  rawText: string;
  storageBuffer: Buffer;
  chunks: Array<{
    chunkIndex: number;
    sectionTitle: string | null;
    content: string;
    tokenCount: number;
    contentHash: string;
    embedding?: number[] | null;
  }>;
};

function mapProject(row: DbRow): ResearchProject {
  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string | null,
    status: row.status as ResearchProject["status"],
    documentCount: Number(row.document_count ?? 0),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDocument(row: DbRow): ResearchDocument {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    fileName: row.file_name as string,
    fileType: row.file_type as string,
    fileSize: Number(row.file_size ?? 0),
    contentHash: row.content_hash as string,
    rawText: row.raw_text as string,
    charCount: Number(row.char_count ?? 0),
    tokenCount: Number(row.token_count ?? 0),
    chunkCount: Number(row.chunk_count ?? 0),
    createdAt: row.created_at as string,
  };
}

function mapChunk(row: DbRow): DocumentChunk {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    projectId: row.project_id as string,
    chunkIndex: Number(row.chunk_index),
    sectionTitle: row.section_title as string | null,
    content: row.content as string,
    tokenCount: Number(row.token_count),
    pageStart: row.page_start as number | null,
    pageEnd: row.page_end as number | null,
  };
}

function mapNote(row: DbRow): ResearchNote {
  return {
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    sourceType: row.source_type as string,
    createdAt: row.created_at as string,
  };
}

function mapHighlight(row: DbRow): Highlight {
  return {
    id: row.id as string,
    quote: row.quote as string,
    note: row.note as string | null,
    chunkId: row.chunk_id as string | null,
    createdAt: row.created_at as string,
  };
}

function mapQa(row: DbRow): QaMessage {
  return {
    id: row.id as string,
    question: row.question as string,
    answer: row.answer as string,
    citations: (row.citations ?? []) as Citation[],
    provider: row.provider as string,
    model: row.model as string,
    pinned: Boolean(row.pinned),
    createdAt: row.created_at as string,
  };
}

function mapCollection(row: DbRow): ResearchCollection {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    ownerProjectId: row.owner_project_id as string | null,
    projectCount: Number(row.project_count ?? 0),
    documentCount: Number(row.document_count ?? 0),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function nestedText(row: DbRow, key: string, field: string) {
  const value = row[key] as DbRow | DbRow[] | null | undefined;
  if (Array.isArray(value)) {
    return (value[0]?.[field] as string | undefined) ?? null;
  }

  return (value?.[field] as string | undefined) ?? null;
}

function mapCollectionDocument(row: DbRow): CollectionDocument {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string,
    projectId: row.project_id as string,
    documentId: row.document_id as string | null,
    projectTitle:
      (row.project_title as string | undefined) ??
      nestedText(row, "research_projects", "title") ??
      "Research project",
    fileName:
      (row.file_name as string | undefined) ??
      nestedText(row, "documents", "file_name"),
    addedAt: row.added_at as string,
  };
}

function mapCollectionNote(row: DbRow): CollectionNote {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string,
    title: row.title as string,
    body: row.body as string,
    sourceType: row.source_type as string,
    createdAt: row.created_at as string,
  };
}

function mapSynthesisReport(row: DbRow): SynthesisReport {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string,
    kind: row.kind as SynthesisReportKind,
    title: row.title as string,
    output: row.output,
    citations: (row.citations ?? []) as Citation[],
    provider: row.provider as string,
    model: row.model as string,
    tokenEstimate: Number(row.token_estimate ?? 0),
    createdAt: row.created_at as string,
  };
}

function mapKnowledgeEntity(row: DbRow): KnowledgeEntity {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string | null,
    projectId: row.project_id as string | null,
    name: row.name as string,
    type: row.type as string,
    summary: row.summary as string,
    confidence: row.confidence as KnowledgeEntity["confidence"],
    mentions: Number(row.mentions ?? 1),
    createdAt: row.created_at as string,
  };
}

function mapDocumentEntity(row: DbRow): DocumentEntity {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string | null,
    projectId: row.project_id as string | null,
    documentId: row.document_id as string | null,
    entityId: row.entity_id as string,
    entityName:
      (row.entity_name as string | undefined) ??
      nestedText(row, "knowledge_entities", "name") ??
      "Entity",
    entityType:
      (row.entity_type as string | undefined) ??
      nestedText(row, "knowledge_entities", "type") ??
      "Concept",
    context: row.context as string | null,
    createdAt: row.created_at as string,
  };
}

function mapEntityRelationship(row: DbRow): EntityRelationship {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string | null,
    sourceEntityId: row.source_entity_id as string,
    targetEntityId: row.target_entity_id as string,
    sourceName:
      (row.source_name as string | undefined) ??
      nestedText(row, "source_entity", "name") ??
      "Source",
    targetName:
      (row.target_name as string | undefined) ??
      nestedText(row, "target_entity", "name") ??
      "Target",
    relation: row.relation as string,
    strength: Number(row.strength ?? 0.5),
    evidence: row.evidence as string | null,
    createdAt: row.created_at as string,
  };
}

function mapLinkedInsight(row: DbRow): LinkedInsight {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string | null,
    projectId: row.project_id as string | null,
    title: row.title as string,
    body: row.body as string,
    category: row.category as string,
    confidence: row.confidence as LinkedInsight["confidence"],
    citations: (row.citations ?? []) as Citation[],
    createdAt: row.created_at as string,
  };
}

function mapResearchClaim(row: DbRow): ResearchClaim {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string | null,
    projectId: row.project_id as string | null,
    claim: row.claim as string,
    evidence: row.evidence as string,
    stance: row.stance as ResearchClaim["stance"],
    confidence: row.confidence as ResearchClaim["confidence"],
    citations: (row.citations ?? []) as Citation[],
    createdAt: row.created_at as string,
  };
}

function mapCollectionQa(row: DbRow): CollectionQaMessage {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string,
    question: row.question as string,
    answer: row.answer as string,
    citations: (row.citations ?? []) as Citation[],
    provider: row.provider as string,
    model: row.model as string,
    pinned: Boolean(row.pinned),
    createdAt: row.created_at as string,
  };
}

function mapPipelineStep(row: DbRow): ResearchPipelineStep {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    name: row.name as string,
    status: row.status as ResearchPipelineStep["status"],
    detail: row.detail as string | null,
    startedAt: row.started_at as string | null,
    completedAt: row.completed_at as string | null,
  };
}

function mapPipelineRun(row: DbRow, steps: ResearchPipelineStep[]): ResearchPipelineRun {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string | null,
    projectId: row.project_id as string | null,
    name: row.name as string,
    status: row.status as ResearchPipelineRun["status"],
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string | null,
    steps,
  };
}

function mapResearchSessionFinding(row: DbRow): ResearchSessionFinding {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    findingType: row.finding_type as string,
    title: row.title as string,
    body: row.body as string,
    citations: (row.citations ?? []) as Citation[],
    confidence: row.confidence as ResearchSessionFinding["confidence"],
    createdAt: row.created_at as string,
  };
}

function mapResearchSession(
  row: DbRow,
  findings: ResearchSessionFinding[],
): ResearchSession {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string | null,
    projectId: row.project_id as string | null,
    title: row.title as string,
    status: row.status as ResearchSession["status"],
    summary: row.summary as string | null,
    memory: (row.memory ?? {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    findings,
  };
}

function mapUsageMetric(row: DbRow): UsageMetric {
  return {
    id: row.id as string,
    action: row.action as string,
    provider: row.provider as string,
    model: row.model as string,
    tokenEstimate: Number(row.token_estimate ?? 0),
    latencyMs: Number(row.latency_ms ?? 0),
    chunkCount: Number(row.chunk_count ?? 0),
    createdAt: row.created_at as string,
  };
}

export async function getResearchContext(): Promise<ResearchContext | null> {
  if (!isSupabaseConfigured()) {
    return {
      mode: "demo",
      user: { id: "demo-user", email: "demo@researchos.local" },
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    mode: "supabase",
    user: { id: user.id, email: user.email ?? null },
    supabase,
  };
}

export async function listProjects(ctx: ResearchContext) {
  if (ctx.mode === "demo") {
    return listDemoProjects();
  }

  const { data, error } = await ctx.supabase
    .from("research_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapProject);
}

export async function listCollections(ctx: ResearchContext) {
  if (ctx.mode === "demo") {
    return listDemoCollections();
  }

  const { data, error } = await ctx.supabase
    .from("research_collections")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapCollection);
}

export async function createResearchCollection(
  ctx: ResearchContext,
  name: string,
  description?: string | null,
  ownerProjectId?: string | null,
) {
  if (ctx.mode === "demo") {
    return createDemoCollection(name, description);
  }

  const values: Record<string, unknown> = {
    user_id: ctx.user.id,
    name,
    description: description ?? null,
  };

  if (ownerProjectId) {
    values.owner_project_id = ownerProjectId;
  }

  const { data, error } = await ctx.supabase
    .from("research_collections")
    .insert(values)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const collection = mapCollection(data);
  await recordAction(ctx, {
    action: "collection.create",
    targetType: "collection",
    targetId: collection.id,
    metadata: { name: collection.name, ownerProjectId: ownerProjectId ?? null },
  });

  return collection;
}

export async function getProjectDetail(
  ctx: ResearchContext,
  projectId: string,
): Promise<ProjectDetail | null> {
  if (ctx.mode === "demo") {
    return getDemoProject(projectId);
  }

  const [
    projectResult,
    documentsResult,
    chunksResult,
    outputsResult,
    notesResult,
    highlightsResult,
    qaResult,
    runsResult,
  ] =
    await Promise.all([
      ctx.supabase
        .from("research_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle(),
      ctx.supabase
        .from("documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("document_chunks")
        .select("*")
        .eq("project_id", projectId)
        .order("chunk_index", { ascending: true })
        .limit(80),
      ctx.supabase
        .from("ai_outputs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("research_notes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("highlights")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("qa_messages")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("research_pipeline_runs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  if (projectResult.error) {
    throw new Error(projectResult.error.message);
  }

  if (!projectResult.data) {
    return null;
  }

  const outputs: ProjectDetail["outputs"] = {};
  for (const output of outputsResult.data ?? []) {
    if (!outputs[output.kind as keyof ProjectDetail["outputs"]]) {
      outputs[output.kind as keyof ProjectDetail["outputs"]] = output.output;
    }
  }

  const runIds = (runsResult.data ?? []).map((run) => run.id as string);
  const stepsResult = runIds.length
    ? await ctx.supabase
        .from("research_pipeline_steps")
        .select("*")
        .in("run_id", runIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (stepsResult.error) {
    throw new Error(stepsResult.error.message);
  }

  const stepsByRun = new Map<string, ResearchPipelineStep[]>();
  for (const row of stepsResult.data ?? []) {
    const step = mapPipelineStep(row);
    stepsByRun.set(step.runId, [...(stepsByRun.get(step.runId) ?? []), step]);
  }

  return {
    ...mapProject(projectResult.data),
    documents: (documentsResult.data ?? []).map(mapDocument),
    chunks: (chunksResult.data ?? []).map(mapChunk),
    outputs,
    notes: (notesResult.data ?? []).map(mapNote),
    highlights: (highlightsResult.data ?? []).map(mapHighlight),
    qa: (qaResult.data ?? []).map(mapQa),
    pipelineRuns: (runsResult.data ?? []).map((run) =>
      mapPipelineRun(run, stepsByRun.get(run.id as string) ?? []),
    ),
  };
}

export async function attachProjectToCollection(
  ctx: ResearchContext,
  collectionId: string,
  projectId: string,
) {
  if (ctx.mode === "demo") {
    return attachDemoProjectToCollection(collectionId, projectId);
  }

  const project = await getProjectDetail(ctx, projectId);
  if (!project) {
    return null;
  }

  const firstDocument = project.documents[0];
  const { data, error } = await ctx.supabase
    .from("collection_documents")
    .upsert(
      {
        collection_id: collectionId,
        project_id: projectId,
        document_id: firstDocument?.id ?? null,
        user_id: ctx.user.id,
      },
      { onConflict: "collection_id,project_id" },
    )
    .select("*, research_projects(title), documents(file_name)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await refreshCollectionCounts(ctx, collectionId);
  const document = mapCollectionDocument(data);
  await recordAction(ctx, {
    action: "collection.attach_document",
    targetType: "collection",
    targetId: collectionId,
    metadata: {
      projectId,
      documentId: document.documentId,
    },
  });

  return document;
}

export async function attachDocumentToCollection(
  ctx: ResearchContext,
  collectionId: string,
  documentId: string,
) {
  if (ctx.mode === "demo") {
    const project = listDemoProjects().find((item) =>
      getDemoProject(item.id)?.documents.some((document) => document.id === documentId),
    );
    return project ? attachDemoProjectToCollection(collectionId, project.id) : null;
  }

  const { data, error } = await ctx.supabase
    .from("documents")
    .select("project_id")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.project_id) {
    return null;
  }

  return attachProjectToCollection(ctx, collectionId, data.project_id as string);
}

async function refreshCollectionCounts(ctx: ResearchContext, collectionId: string) {
  if (ctx.mode === "demo") {
    return;
  }

  const { data, error } = await ctx.supabase
    .from("collection_documents")
    .select("id")
    .eq("collection_id", collectionId);

  if (error) {
    throw new Error(error.message);
  }

  const count = data?.length ?? 0;
  const update = await ctx.supabase
    .from("research_collections")
    .update({
      project_count: count,
      document_count: count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", collectionId);

  if (update.error) {
    throw new Error(update.error.message);
  }
}

export async function getCollectionDetail(
  ctx: ResearchContext,
  collectionId: string,
): Promise<CollectionDetail | null> {
  if (ctx.mode === "demo") {
    return getDemoCollection(collectionId);
  }

  const [
    collectionResult,
    documentsResult,
    notesResult,
    reportsResult,
    entitiesResult,
    documentEntitiesResult,
    relationshipsResult,
    insightsResult,
    claimsResult,
    qaResult,
    runsResult,
    sessionsResult,
  ] = await Promise.all([
    ctx.supabase
      .from("research_collections")
      .select("*")
      .eq("id", collectionId)
      .maybeSingle(),
    ctx.supabase
      .from("collection_documents")
      .select("*, research_projects(title), documents(file_name)")
      .eq("collection_id", collectionId)
      .order("added_at", { ascending: false }),
    ctx.supabase
      .from("collection_notes")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("synthesis_reports")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("knowledge_entities")
      .select("*")
      .eq("collection_id", collectionId)
      .order("mentions", { ascending: false }),
    ctx.supabase
      .from("document_entities")
      .select("*, knowledge_entities(name, type)")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("entity_relationships")
      .select(
        "*, source_entity:knowledge_entities!entity_relationships_source_entity_id_fkey(name), target_entity:knowledge_entities!entity_relationships_target_entity_id_fkey(name)",
      )
      .eq("collection_id", collectionId)
      .order("strength", { ascending: false }),
    ctx.supabase
      .from("linked_insights")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("research_claims")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("collection_qa_messages")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("research_pipeline_runs")
      .select("*")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: false })
      .limit(8),
    ctx.supabase
      .from("research_sessions")
      .select("*")
      .eq("collection_id", collectionId)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  if (collectionResult.error) {
    throw new Error(collectionResult.error.message);
  }

  if (!collectionResult.data) {
    return null;
  }

  const runIds = (runsResult.data ?? []).map((run) => run.id as string);
  const sessionIds = (sessionsResult.data ?? []).map(
    (session) => session.id as string,
  );
  const stepsResult = runIds.length
    ? await ctx.supabase
        .from("research_pipeline_steps")
        .select("*")
        .in("run_id", runIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  const findingsResult = sessionIds.length
    ? await ctx.supabase
        .from("research_session_findings")
        .select("*")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  if (stepsResult.error) {
    throw new Error(stepsResult.error.message);
  }
  if (findingsResult.error) {
    throw new Error(findingsResult.error.message);
  }

  const stepsByRun = new Map<string, ResearchPipelineStep[]>();
  for (const row of stepsResult.data ?? []) {
    const step = mapPipelineStep(row);
    stepsByRun.set(step.runId, [...(stepsByRun.get(step.runId) ?? []), step]);
  }
  const findingsBySession = new Map<string, ResearchSessionFinding[]>();
  for (const row of findingsResult.data ?? []) {
    const finding = mapResearchSessionFinding(row);
    findingsBySession.set(finding.sessionId, [
      ...(findingsBySession.get(finding.sessionId) ?? []),
      finding,
    ]);
  }

  return {
    ...mapCollection(collectionResult.data),
    documents: (documentsResult.data ?? []).map(mapCollectionDocument),
    notes: (notesResult.data ?? []).map(mapCollectionNote),
    reports: (reportsResult.data ?? []).map(mapSynthesisReport),
    entities: (entitiesResult.data ?? []).map(mapKnowledgeEntity),
    documentEntities: (documentEntitiesResult.data ?? []).map(mapDocumentEntity),
    relationships: (relationshipsResult.data ?? []).map(mapEntityRelationship),
    insights: (insightsResult.data ?? []).map(mapLinkedInsight),
    claims: (claimsResult.data ?? []).map(mapResearchClaim),
    qa: (qaResult.data ?? []).map(mapCollectionQa),
    pipelineRuns: (runsResult.data ?? []).map((run) =>
      mapPipelineRun(run, stepsByRun.get(run.id as string) ?? []),
    ),
    sessions: (sessionsResult.data ?? []).map((session) =>
      mapResearchSession(
        session,
        findingsBySession.get(session.id as string) ?? [],
      ),
    ),
  };
}

export async function getEntityDetail(
  ctx: ResearchContext,
  entityId: string,
): Promise<EntityDetail | null> {
  if (ctx.mode === "demo") {
    for (const collection of listDemoCollections()) {
      const detail = getDemoCollection(collection.id);
      const entity = detail.entities.find((item) => item.id === entityId);
      if (entity) {
        const name = entity.name.toLowerCase();
        return {
          ...entity,
          documentEntities: detail.documentEntities.filter(
            (item) => item.entityId === entity.id,
          ),
          relationships: detail.relationships.filter(
            (item) =>
              item.sourceEntityId === entity.id || item.targetEntityId === entity.id,
          ),
          relatedInsights: detail.insights.filter((insight) =>
            `${insight.title} ${insight.body}`.toLowerCase().includes(name),
          ),
          relatedClaims: detail.claims.filter((claim) =>
            `${claim.claim} ${claim.evidence}`.toLowerCase().includes(name),
          ),
          collection,
        };
      }
    }

    return null;
  }

  const entityResult = await ctx.supabase
    .from("knowledge_entities")
    .select("*")
    .eq("id", entityId)
    .maybeSingle();

  if (entityResult.error) {
    throw new Error(entityResult.error.message);
  }

  if (!entityResult.data) {
    return null;
  }

  const entity = mapKnowledgeEntity(entityResult.data);
  const [
    collectionResult,
    documentEntitiesResult,
    relationshipsResult,
    insightsResult,
    claimsResult,
  ] = await Promise.all([
    entity.collectionId
      ? ctx.supabase
          .from("research_collections")
          .select("*")
          .eq("id", entity.collectionId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    ctx.supabase
      .from("document_entities")
      .select("*, knowledge_entities(name, type)")
      .eq("entity_id", entity.id)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("entity_relationships")
      .select(
        "*, source_entity:knowledge_entities!entity_relationships_source_entity_id_fkey(name), target_entity:knowledge_entities!entity_relationships_target_entity_id_fkey(name)",
      )
      .or(`source_entity_id.eq.${entity.id},target_entity_id.eq.${entity.id}`)
      .order("strength", { ascending: false }),
    entity.collectionId
      ? ctx.supabase
          .from("linked_insights")
          .select("*")
          .eq("collection_id", entity.collectionId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    entity.collectionId
      ? ctx.supabase
          .from("research_claims")
          .select("*")
          .eq("collection_id", entity.collectionId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [
    collectionResult,
    documentEntitiesResult,
    relationshipsResult,
    insightsResult,
    claimsResult,
  ]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const name = entity.name.toLowerCase();

  return {
    ...entity,
    documentEntities: (documentEntitiesResult.data ?? []).map(mapDocumentEntity),
    relationships: (relationshipsResult.data ?? []).map(mapEntityRelationship),
    relatedInsights: (insightsResult.data ?? [])
      .map(mapLinkedInsight)
      .filter((insight) =>
        `${insight.title} ${insight.body}`.toLowerCase().includes(name),
      ),
    relatedClaims: (claimsResult.data ?? [])
      .map(mapResearchClaim)
      .filter((claim) =>
        `${claim.claim} ${claim.evidence}`.toLowerCase().includes(name),
      ),
    collection: collectionResult.data
      ? mapCollection(collectionResult.data)
      : null,
  };
}

export async function listKnowledgeEntities(
  ctx: ResearchContext,
  input: {
    collectionId?: string | null;
    query?: string | null;
  } = {},
): Promise<KnowledgeEntity[]> {
  const search = input.query?.toLowerCase().trim();

  if (ctx.mode === "demo") {
    const entities = listDemoCollections().flatMap((collection) =>
      getDemoCollection(collection.id).entities,
    );
    return entities.filter((entity) => {
      if (input.collectionId && entity.collectionId !== input.collectionId) {
        return false;
      }

      if (!search) {
        return true;
      }

      return `${entity.name} ${entity.type} ${entity.summary}`
        .toLowerCase()
        .includes(search);
    });
  }

  let query = ctx.supabase
    .from("knowledge_entities")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (input.collectionId) {
    query = query.eq("collection_id", input.collectionId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const entities = (data ?? []).map(mapKnowledgeEntity);
  if (!search) {
    return entities;
  }

  return entities.filter((entity) =>
    `${entity.name} ${entity.type} ${entity.summary}`
      .toLowerCase()
      .includes(search),
  );
}

export async function createProjectFromDocument(
  ctx: ResearchContext,
  input: CreateProjectInput,
) {
  if (ctx.mode === "demo") {
    return createDemoProjectFromDocument(input);
  }

  const duplicate = await ctx.supabase
    .from("documents")
    .select("project_id")
    .eq("content_hash", input.contentHash)
    .maybeSingle();

  if (duplicate.data?.project_id) {
    const existing = await getProjectDetail(ctx, duplicate.data.project_id);
    if (existing) {
      return existing;
    }
  }

  const safeFileName = input.fileName.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${ctx.user.id}/${input.contentHash}/${safeFileName}`;
  const upload = await ctx.supabase.storage
    .from("research-documents")
    .upload(storagePath, input.storageBuffer, {
      contentType: input.fileType,
      upsert: true,
    });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const projectInsert = await ctx.supabase
    .from("research_projects")
    .insert({
      user_id: ctx.user.id,
      title: input.title,
      status: "ready",
      document_count: 1,
    })
    .select("*")
    .single();

  if (projectInsert.error) {
    throw new Error(projectInsert.error.message);
  }

  const documentInsert = await ctx.supabase
    .from("documents")
    .insert({
      project_id: projectInsert.data.id,
      user_id: ctx.user.id,
      storage_path: storagePath,
      file_name: input.fileName,
      file_type: input.fileType,
      file_size: input.fileSize,
      content_hash: input.contentHash,
      raw_text: input.rawText,
      char_count: input.rawText.length,
      token_count: Math.ceil(input.rawText.length / 4),
      chunk_count: input.chunks.length,
    })
    .select("*")
    .single();

  if (documentInsert.error) {
    throw new Error(documentInsert.error.message);
  }

  if (input.chunks.length) {
    const rows = input.chunks.map((chunk) => ({
      project_id: projectInsert.data.id,
      document_id: documentInsert.data.id,
      user_id: ctx.user.id,
      chunk_index: chunk.chunkIndex,
      section_title: chunk.sectionTitle,
      content: chunk.content,
      token_count: chunk.tokenCount,
      content_hash: chunk.contentHash,
      embedding: vectorLiteral(chunk.embedding ?? null),
    }));

    const chunksInsert = await ctx.supabase.from("document_chunks").insert(rows);

    if (chunksInsert.error) {
      throw new Error(chunksInsert.error.message);
    }
  }

  const detail = await getProjectDetail(ctx, projectInsert.data.id);
  if (!detail) {
    throw new Error("Project was created but could not be loaded.");
  }

  await recordAction(ctx, {
    action: "document.upload",
    targetType: "project",
    targetId: detail.id,
    metadata: {
      fileName: input.fileName,
      chunkCount: input.chunks.length,
      tokenEstimate: Math.ceil(input.rawText.length / 4),
    },
  });
  await recordPipelineRun(ctx, {
    projectId: detail.id,
    name: "Document ingestion",
    steps: [
      "Upload",
      "Extract text",
      "Chunk document",
      input.chunks.some((chunk) => chunk.embedding) ? "Embed chunks" : "Prepare lexical retrieval",
      "Store source",
    ],
  });

  return (await getProjectDetail(ctx, detail.id)) ?? detail;
}

export async function getProjectChunks(ctx: ResearchContext, projectId: string) {
  if (ctx.mode === "demo") {
    return getDemoProject(projectId).chunks;
  }

  const { data, error } = await ctx.supabase
    .from("document_chunks")
    .select("*")
    .eq("project_id", projectId)
    .order("chunk_index", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapChunk);
}

export async function getCollectionChunks(
  ctx: ResearchContext,
  collectionId: string,
): Promise<RetrievalHit[]> {
  if (ctx.mode === "demo") {
    return getDemoCollectionChunks(collectionId);
  }

  const linksResult = await ctx.supabase
    .from("collection_documents")
    .select("*, research_projects(title), documents(file_name)")
    .eq("collection_id", collectionId);

  if (linksResult.error) {
    throw new Error(linksResult.error.message);
  }

  const links = (linksResult.data ?? []).map(mapCollectionDocument);
  const projectIds = links.map((link) => link.projectId);

  if (!projectIds.length) {
    return [];
  }

  const chunksResult = await ctx.supabase
    .from("document_chunks")
    .select("*")
    .in("project_id", projectIds)
    .order("chunk_index", { ascending: true })
    .limit(180);

  if (chunksResult.error) {
    throw new Error(chunksResult.error.message);
  }

  const linkByProject = new Map(links.map((link) => [link.projectId, link]));

  return (chunksResult.data ?? []).map((row) => {
    const chunk = mapChunk(row);
    const link = linkByProject.get(chunk.projectId);

    return {
      ...chunk,
      similarity: 0,
      documentTitle: link?.fileName ?? null,
      projectTitle: link?.projectTitle ?? null,
    };
  });
}

export async function getCachedOutput(
  ctx: ResearchContext,
  projectId: string,
  kind: "summary" | "insights" | "keywords",
  inputHash: string,
  depth?: string | null,
) {
  if (ctx.mode === "demo") {
    return getDemoOutput(projectId, kind, inputHash, depth);
  }

  let query = ctx.supabase
    .from("ai_outputs")
    .select("output")
    .eq("project_id", projectId)
    .eq("kind", kind)
    .eq("input_hash", inputHash)
    .order("created_at", { ascending: false })
    .limit(1);

  query = depth ? query.eq("depth", depth) : query.is("depth", null);
  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.output;
}

export async function saveOutput(
  ctx: ResearchContext,
  input: {
    projectId: string;
    documentId?: string | null;
    kind: "summary" | "insights" | "keywords";
    depth?: string | null;
    inputHash: string;
    output: unknown;
    provider: string;
    model: string;
    promptVersion: string;
    tokenEstimate: number;
  },
) {
  if (ctx.mode === "demo") {
    saveDemoOutput({ ...input, projectId: input.projectId });
    return;
  }

  let deleteQuery = ctx.supabase
    .from("ai_outputs")
    .delete()
    .eq("project_id", input.projectId)
    .eq("kind", input.kind)
    .eq("input_hash", input.inputHash);

  deleteQuery = input.depth
    ? deleteQuery.eq("depth", input.depth)
    : deleteQuery.is("depth", null);

  const deleted = await deleteQuery;
  if (deleted.error) {
    throw new Error(deleted.error.message);
  }

  const { error } = await ctx.supabase.from("ai_outputs").insert({
    project_id: input.projectId,
    document_id: input.documentId,
    user_id: ctx.user.id,
    kind: input.kind,
    depth: input.depth ?? null,
    input_hash: input.inputHash,
    output: input.output,
    provider: input.provider,
    model: input.model,
    prompt_version: input.promptVersion,
    token_estimate: input.tokenEstimate,
  });

  if (error) {
    throw new Error(error.message);
  }

  await recordAction(ctx, {
    action: `ai.${input.kind}`,
    targetType: "project",
    targetId: input.projectId,
    metadata: {
      documentId: input.documentId ?? null,
      depth: input.depth ?? null,
      provider: input.provider,
      tokenEstimate: input.tokenEstimate,
    },
  });
}

export async function getCachedQaResponse(
  ctx: ResearchContext,
  input: {
    scope: "project" | "collection";
    questionHash: string;
  },
): Promise<CachedQaResponse | null> {
  if (ctx.mode === "demo") {
    return getDemoCachedQa(`${input.scope}:${input.questionHash}`) ?? null;
  }

  const { data, error } = await ctx.supabase
    .from("qa_response_cache")
    .select("*")
    .eq("scope", input.scope)
    .eq("question_hash", input.questionHash)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    output: data.output,
    provider: data.provider as string,
    model: data.model as string,
    tokenEstimate: Number(data.token_estimate ?? 0),
    createdAt: data.created_at as string,
  };
}

export async function saveCachedQaResponse(
  ctx: ResearchContext,
  input: {
    scope: "project" | "collection";
    projectId?: string | null;
    collectionId?: string | null;
    questionHash: string;
    question: string;
    output: unknown;
    provider: string;
    model: string;
    tokenEstimate: number;
  },
) {
  if (ctx.mode === "demo") {
    saveDemoCachedQa(`${input.scope}:${input.questionHash}`, {
      output: input.output,
      provider: input.provider,
      model: input.model,
      tokenEstimate: input.tokenEstimate,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const { error } = await ctx.supabase.from("qa_response_cache").upsert(
    {
      user_id: ctx.user.id,
      scope: input.scope,
      project_id: input.projectId ?? null,
      collection_id: input.collectionId ?? null,
      question_hash: input.questionHash,
      question: input.question,
      output: input.output,
      provider: input.provider,
      model: input.model,
      token_estimate: input.tokenEstimate,
    },
    { onConflict: "user_id,scope,question_hash" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  );
}

const retrievalStopwords = new Set([
  "about",
  "after",
  "again",
  "against",
  "also",
  "and",
  "are",
  "because",
  "between",
  "can",
  "could",
  "does",
  "from",
  "has",
  "have",
  "how",
  "into",
  "that",
  "the",
  "their",
  "there",
  "these",
  "this",
  "those",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
]);

function meaningfulTokens(text: string) {
  return Array.from(tokenize(text)).filter(
    (token) => !retrievalStopwords.has(token),
  );
}

function rewriteRetrievalQuery(question: string) {
  const normalized = question.trim().replace(/\s+/g, " ");
  const tokens = meaningfulTokens(normalized);
  const phrases = normalized
    .match(/"([^"]+)"|'([^']+)'/g)
    ?.map((phrase) => phrase.replace(/^["']|["']$/g, "").toLowerCase()) ?? [];
  const bigrams = tokens.slice(0, 10).flatMap((token, index) => {
    const next = tokens[index + 1];
    return next ? [`${token} ${next}`] : [];
  });

  return Array.from(new Set([normalized.toLowerCase(), ...phrases, ...tokens, ...bigrams]))
    .join(" ")
    .slice(0, 900);
}

function chunkFingerprint(content: string) {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 360);
}

function compressRetrievedContent(content: string, question: string, maxChars = 980) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= maxChars) {
    return compact;
  }

  const questionTokens = new Set(meaningfulTokens(question));
  const sentences = compact
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 24);

  if (!sentences.length) {
    return `${compact.slice(0, maxChars - 1).trim()}…`;
  }

  const selected = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score:
        lexicalScore(sentence, questionTokens, question) +
        (index < 2 ? 0.08 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join(" ");

  return selected.length > maxChars
    ? `${selected.slice(0, maxChars - 1).trim()}…`
    : selected;
}

function finalizeRetrievalHits(
  hits: RetrievalHit[],
  question: string,
  rewrittenQuestion: string,
  count: number,
) {
  const questionTokens = new Set(meaningfulTokens(rewrittenQuestion || question));
  const seen = new Set<string>();

  return hits
    .map((hit) => {
      const lexical = lexicalScore(hit.content, questionTokens, question);
      const citationBoost = hit.sectionTitle || hit.pageStart ? 0.03 : 0;

      return {
        ...hit,
        content: compressRetrievedContent(hit.content, question),
        similarity: hit.similarity * 0.64 + lexical * 0.34 + citationBoost,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .filter((hit) => {
      const key = chunkFingerprint(hit.content) || hit.id;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, count);
}

function lexicalRetrieve(chunks: DocumentChunk[], question: string, count: number) {
  const rewrittenQuestion = rewriteRetrievalQuery(question);
  const questionTokens = new Set(meaningfulTokens(rewrittenQuestion || question));

  const hits = chunks
    .map((chunk) => {
      return {
        ...chunk,
        similarity: lexicalScore(chunk.content, questionTokens, question),
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(count * 2, count));

  return finalizeRetrievalHits(hits, question, rewrittenQuestion, count);
}

function lexicalScore(
  content: string,
  questionTokens: Set<string>,
  question: string,
) {
  const contentTokens = tokenize(content);
  let overlap = 0;
  for (const token of questionTokens) {
    if (contentTokens.has(token)) {
      overlap += 1;
    }
  }

  const phraseBoost = content
    .toLowerCase()
    .includes(question.toLowerCase().slice(0, 32))
    ? 2
    : 0;

  return questionTokens.size === 0
    ? 0
    : (overlap + phraseBoost) / questionTokens.size;
}

function mergeHybridHits(
  vectorHits: RetrievalHit[],
  lexicalHits: RetrievalHit[],
) {
  const merged = new Map<string, RetrievalHit>();
  for (const hit of vectorHits) {
    merged.set(hit.id, { ...hit, similarity: hit.similarity * 0.72 });
  }

  for (const hit of lexicalHits) {
    const existing = merged.get(hit.id);
    merged.set(hit.id, {
      ...hit,
      ...existing,
      similarity: (existing?.similarity ?? 0) + hit.similarity * 0.28,
    });
  }

  return Array.from(merged.values()).sort((a, b) => b.similarity - a.similarity);
}

export async function retrieveRelevantChunks(
  ctx: ResearchContext,
  projectId: string,
  question: string,
  count = 6,
): Promise<RetrievalHit[]> {
  const rewrittenQuestion = rewriteRetrievalQuery(question);
  if (ctx.mode === "supabase") {
    const embedding = await embedText(`${question}\n${rewrittenQuestion}`);

    if (embedding) {
      const { data, error } = await ctx.supabase.rpc("match_document_chunks", {
        match_project_id: projectId,
        query_embedding: vectorLiteral(embedding),
        match_count: Math.max(count * 2, count),
      });

      if (!error && data?.length) {
        const vectorHits = data.map((row: DbRow) => ({
          id: row.id as string,
          documentId: row.document_id as string,
          projectId,
          chunkIndex: Number(row.chunk_index),
          sectionTitle: row.section_title as string | null,
          content: row.content as string,
          tokenCount: Math.ceil(String(row.content).length / 4),
          pageStart: row.page_start as number | null,
          pageEnd: row.page_end as number | null,
          similarity: Number(row.similarity ?? 0),
        }));
        const lexicalHits = lexicalRetrieve(
          await getProjectChunks(ctx, projectId),
          rewrittenQuestion,
          Math.max(count * 2, count),
        );

        return finalizeRetrievalHits(
          mergeHybridHits(vectorHits, lexicalHits),
          question,
          rewrittenQuestion,
          count,
        );
      }
    }
  }

  const chunks = await getProjectChunks(ctx, projectId);
  return lexicalRetrieve(chunks, question, count);
}

export async function retrieveRelevantCollectionChunks(
  ctx: ResearchContext,
  collectionId: string,
  question: string,
  count = 8,
): Promise<RetrievalHit[]> {
  const collection = await getCollectionDetail(ctx, collectionId);
  const rewrittenQuestion = rewriteRetrievalQuery(question);
  if (!collection) {
    return [];
  }

  if (ctx.mode === "supabase" && collection.documents.length) {
    const perProject = Math.max(3, Math.ceil(count / collection.documents.length));
    const groupedHits = await Promise.all(
      collection.documents.map(async (document) => {
        const hits = await retrieveRelevantChunks(
          ctx,
          document.projectId,
          rewrittenQuestion,
          perProject,
        );

        return hits.map((hit) => ({
          ...hit,
          documentTitle: document.fileName ?? null,
          projectTitle: document.projectTitle,
        }));
      }),
    );

    const hits = finalizeRetrievalHits(
      groupedHits.flat(),
      question,
      rewrittenQuestion,
      count,
    );

    if (hits.length) {
      return hits;
    }
  }

  const chunks = await getCollectionChunks(ctx, collectionId);
  return lexicalRetrieve(chunks, rewrittenQuestion, count);
}

export async function addNote(
  ctx: ResearchContext,
  projectId: string,
  body: string,
  title?: string,
) {
  if (ctx.mode === "demo") {
    return addDemoNote(projectId, body, title);
  }

  const { data, error } = await ctx.supabase
    .from("research_notes")
    .insert({
      project_id: projectId,
      user_id: ctx.user.id,
      title: title || "Research note",
      body,
      source_type: "manual",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapNote(data);
}

export async function addCollectionNote(
  ctx: ResearchContext,
  collectionId: string,
  body: string,
  title?: string,
) {
  if (ctx.mode === "demo") {
    return addDemoCollectionNote(collectionId, body, title);
  }

  const { data, error } = await ctx.supabase
    .from("collection_notes")
    .insert({
      collection_id: collectionId,
      user_id: ctx.user.id,
      title: title || "Collection note",
      body,
      source_type: "manual",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const note = mapCollectionNote(data);
  await recordAction(ctx, {
    action: "collection.note",
    targetType: "collection",
    targetId: collectionId,
    metadata: { noteId: note.id },
  });

  return note;
}

export async function removeCollectionDocument(
  ctx: ResearchContext,
  collectionId: string,
  input: {
    linkId?: string | null;
    projectId?: string | null;
    documentId?: string | null;
  },
) {
  if (ctx.mode === "demo") {
    return removeDemoCollectionDocument(collectionId, input);
  }

  let query = ctx.supabase
    .from("collection_documents")
    .delete()
    .eq("collection_id", collectionId)
    .eq("user_id", ctx.user.id);

  if (input.linkId) {
    query = query.eq("id", input.linkId);
  } else if (input.projectId) {
    query = query.eq("project_id", input.projectId);
  } else if (input.documentId) {
    query = query.eq("document_id", input.documentId);
  } else {
    return false;
  }

  const { error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  await refreshCollectionCounts(ctx, collectionId);
  await recordAction(ctx, {
    action: "collection.remove_document",
    targetType: "collection",
    targetId: collectionId,
    metadata: input,
  });

  return true;
}

export async function addHighlight(
  ctx: ResearchContext,
  projectId: string,
  quote: string,
  chunkId?: string,
  note?: string,
) {
  if (ctx.mode === "demo") {
    return addDemoHighlight(projectId, quote, chunkId, note);
  }

  const detail = await getProjectDetail(ctx, projectId);
  const firstDocument = detail?.documents[0];

  const { data, error } = await ctx.supabase
    .from("highlights")
    .insert({
      project_id: projectId,
      document_id: firstDocument?.id ?? null,
      chunk_id: chunkId || null,
      user_id: ctx.user.id,
      quote,
      note: note || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapHighlight(data);
}

export async function addQaMessage(
  ctx: ResearchContext,
  projectId: string,
  question: string,
  answer: string,
  citations: Citation[],
  provider: string,
  model: string,
) {
  if (ctx.mode === "demo") {
    return addDemoQa(projectId, question, answer, citations, provider, model);
  }

  const { data, error } = await ctx.supabase
    .from("qa_messages")
    .insert({
      project_id: projectId,
      user_id: ctx.user.id,
      question,
      answer,
      citations,
      provider,
      model,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const message = mapQa(data);
  await recordAction(ctx, {
    action: "ai.chat",
    targetType: "project",
    targetId: projectId,
    metadata: {
      messageId: message.id,
      provider,
      citationCount: citations.length,
    },
  });

  return message;
}

export async function togglePin(
  ctx: ResearchContext,
  projectId: string,
  messageId: string,
) {
  if (ctx.mode === "demo") {
    return toggleDemoPin(projectId, messageId);
  }

  const current = await ctx.supabase
    .from("qa_messages")
    .select("pinned")
    .eq("project_id", projectId)
    .eq("id", messageId)
    .maybeSingle();

  if (current.error || !current.data) {
    return null;
  }

  const { data, error } = await ctx.supabase
    .from("qa_messages")
    .update({ pinned: !current.data.pinned })
    .eq("project_id", projectId)
    .eq("id", messageId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapQa(data);
}

export async function saveExportRecord(
  ctx: ResearchContext,
  projectId: string,
  format: "markdown" | "json",
  payload: string,
) {
  if (ctx.mode === "demo") {
    return;
  }

  const { error } = await ctx.supabase.from("research_exports").insert({
    project_id: projectId,
    user_id: ctx.user.id,
    format,
    payload,
  });

  if (error) {
    throw new Error(error.message);
  }

  await recordAction(ctx, {
    action: "report.export",
    targetType: "project",
    targetId: projectId,
    metadata: {
      format,
      payloadBytes: payload.length,
    },
  });
}

export async function saveCollectionSynthesisReport(
  ctx: ResearchContext,
  input: {
    collectionId: string;
    kind: SynthesisReportKind;
    title: string;
    output: unknown;
    citations: Citation[];
    provider: string;
    model: string;
    promptVersion: string;
    tokenEstimate: number;
  },
) {
  if (ctx.mode === "demo") {
    return saveDemoSynthesisReport(input);
  }

  const { data, error } = await ctx.supabase
    .from("synthesis_reports")
    .insert({
      collection_id: input.collectionId,
      user_id: ctx.user.id,
      kind: input.kind,
      title: input.title,
      output: input.output,
      citations: input.citations,
      provider: input.provider,
      model: input.model,
      prompt_version: input.promptVersion,
      token_estimate: input.tokenEstimate,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const report = mapSynthesisReport(data);
  await recordAction(ctx, {
    action: "collection.synthesize",
    targetType: "collection",
    targetId: input.collectionId,
    metadata: {
      kind: input.kind,
      provider: input.provider,
      tokenEstimate: input.tokenEstimate,
    },
  });

  return report;
}

export async function saveCollectionKnowledge(
  ctx: ResearchContext,
  input: {
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
  },
) {
  if (ctx.mode === "demo") {
    return saveDemoKnowledge(input);
  }

  await Promise.all([
    ctx.supabase
      .from("knowledge_entities")
      .delete()
      .eq("collection_id", input.collectionId),
    ctx.supabase
      .from("document_entities")
      .delete()
      .eq("collection_id", input.collectionId),
    ctx.supabase
      .from("entity_relationships")
      .delete()
      .eq("collection_id", input.collectionId),
    ctx.supabase
      .from("linked_insights")
      .delete()
      .eq("collection_id", input.collectionId),
    ctx.supabase
      .from("research_claims")
      .delete()
      .eq("collection_id", input.collectionId),
  ]);

  const entityRows = input.entities.map((entity) => ({
    collection_id: input.collectionId,
    project_id: entity.projectId ?? null,
    user_id: ctx.user.id,
    name: entity.name,
    type: entity.type,
    summary: entity.summary,
    confidence: entity.confidence,
    mentions: entity.mentions,
  }));
  const insightRows = input.insights.map((insight) => ({
    collection_id: input.collectionId,
    project_id: insight.projectId ?? null,
    user_id: ctx.user.id,
    title: insight.title,
    body: insight.body,
    category: insight.category,
    confidence: insight.confidence,
    citations: insight.citations,
  }));
  const claimRows = input.claims.map((claim) => ({
    collection_id: input.collectionId,
    project_id: claim.projectId ?? null,
    user_id: ctx.user.id,
    claim: claim.claim,
    evidence: claim.evidence,
    stance: claim.stance,
    confidence: claim.confidence,
    citations: claim.citations,
  }));

  const [entitiesResult, insightsResult, claimsResult] = await Promise.all([
    entityRows.length
      ? ctx.supabase.from("knowledge_entities").insert(entityRows).select("*")
      : Promise.resolve({ data: [], error: null }),
    insightRows.length
      ? ctx.supabase.from("linked_insights").insert(insightRows).select("*")
      : Promise.resolve({ data: [], error: null }),
    claimRows.length
      ? ctx.supabase.from("research_claims").insert(claimRows).select("*")
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [entitiesResult, insightsResult, claimsResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const entities = (entitiesResult.data ?? []).map(mapKnowledgeEntity);
  const entityByName = new Map(
    entities.map((entity) => [entity.name.toLowerCase(), entity]),
  );
  const collection = await getCollectionDetail(ctx, input.collectionId);
  const documentEntityRows = (collection?.documents ?? []).flatMap((document) =>
    entities.map((entity) => ({
      collection_id: input.collectionId,
      project_id: document.projectId,
      document_id: document.documentId ?? null,
      entity_id: entity.id,
      user_id: ctx.user.id,
      context: `Mentioned in ${document.projectTitle}.`,
    })),
  );
  const relationshipRows = (input.relationships ?? []).flatMap((relationship) => {
    const source = entityByName.get(relationship.source.toLowerCase());
    const target = entityByName.get(relationship.target.toLowerCase());

    if (!source || !target || source.id === target.id) {
      return [];
    }

    return [
      {
        collection_id: input.collectionId,
        source_entity_id: source.id,
        target_entity_id: target.id,
        user_id: ctx.user.id,
        relation: relationship.relation,
        strength: relationship.strength,
        evidence: relationship.evidence ?? null,
      },
    ];
  });

  const [documentEntitiesResult, relationshipsResult] = await Promise.all([
    documentEntityRows.length
      ? ctx.supabase
          .from("document_entities")
          .insert(documentEntityRows)
          .select("*, knowledge_entities(name, type)")
      : Promise.resolve({ data: [], error: null }),
    relationshipRows.length
      ? ctx.supabase
          .from("entity_relationships")
          .insert(relationshipRows)
          .select(
            "*, source_entity:knowledge_entities!entity_relationships_source_entity_id_fkey(name), target_entity:knowledge_entities!entity_relationships_target_entity_id_fkey(name)",
          )
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [documentEntitiesResult, relationshipsResult]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const saved = {
    entities,
    documentEntities: (documentEntitiesResult.data ?? []).map(mapDocumentEntity),
    relationships: (relationshipsResult.data ?? []).map(mapEntityRelationship),
    insights: (insightsResult.data ?? []).map(mapLinkedInsight),
    claims: (claimsResult.data ?? []).map(mapResearchClaim),
  };

  await recordAction(ctx, {
    action: "collection.extract_knowledge",
    targetType: "collection",
    targetId: input.collectionId,
    metadata: {
      entities: saved.entities.length,
      relationships: saved.relationships.length,
      claims: saved.claims.length,
    },
  });

  return saved;
}

export async function addCollectionQaMessage(
  ctx: ResearchContext,
  collectionId: string,
  question: string,
  answer: string,
  citations: Citation[],
  provider: string,
  model: string,
) {
  if (ctx.mode === "demo") {
    return addDemoCollectionQa(collectionId, question, answer, citations, provider, model);
  }

  const { data, error } = await ctx.supabase
    .from("collection_qa_messages")
    .insert({
      collection_id: collectionId,
      user_id: ctx.user.id,
      question,
      answer,
      citations,
      provider,
      model,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const message = mapCollectionQa(data);
  await recordAction(ctx, {
    action: "collection.chat",
    targetType: "collection",
    targetId: collectionId,
    metadata: {
      messageId: message.id,
      provider,
      citationCount: citations.length,
    },
  });

  return message;
}

export async function recordUsageMetric(
  ctx: ResearchContext,
  input: Omit<UsageMetric, "id" | "createdAt"> & {
    collectionId?: string | null;
    projectId?: string | null;
  },
) {
  if (ctx.mode === "demo") {
    return addDemoUsageMetric(input);
  }

  const { data, error } = await ctx.supabase
    .from("ai_usage_metrics")
    .insert({
      collection_id: input.collectionId ?? null,
      project_id: input.projectId ?? null,
      user_id: ctx.user.id,
      action: input.action,
      provider: input.provider,
      model: input.model,
      token_estimate: input.tokenEstimate,
      latency_ms: input.latencyMs,
      chunk_count: input.chunkCount,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapUsageMetric(data);
}

export async function recordPipelineRun(
  ctx: ResearchContext,
  input: {
    collectionId?: string | null;
    projectId?: string | null;
    name: string;
    steps: string[];
  },
) {
  if (ctx.mode === "demo") {
    return createDemoPipelineRun(input);
  }

  const now = new Date().toISOString();
  const runResult = await ctx.supabase
    .from("research_pipeline_runs")
    .insert({
      collection_id: input.collectionId ?? null,
      project_id: input.projectId ?? null,
      user_id: ctx.user.id,
      name: input.name,
      status: "complete",
      completed_at: now,
    })
    .select("*")
    .single();

  if (runResult.error) {
    throw new Error(runResult.error.message);
  }

  const stepRows = input.steps.map((step) => ({
    run_id: runResult.data.id,
    user_id: ctx.user.id,
    name: step,
    status: "complete",
    detail: `${step} completed.`,
    started_at: now,
    completed_at: now,
  }));

  const stepsResult = stepRows.length
    ? await ctx.supabase
        .from("research_pipeline_steps")
        .insert(stepRows)
        .select("*")
    : { data: [], error: null };

  if (stepsResult.error) {
    throw new Error(stepsResult.error.message);
  }

  return mapPipelineRun(
    runResult.data,
    (stepsResult.data ?? []).map(mapPipelineStep),
  );
}

export async function createResearchSession(
  ctx: ResearchContext,
  input: {
    collectionId?: string | null;
    projectId?: string | null;
    title: string;
    summary?: string | null;
    memory?: Record<string, unknown>;
    findings?: Array<{
      findingType: string;
      title: string;
      body: string;
      citations?: Citation[];
      confidence?: "low" | "medium" | "high";
    }>;
  },
) {
  if (ctx.mode === "demo") {
    return createDemoResearchSession(input);
  }

  const { data, error } = await ctx.supabase
    .from("research_sessions")
    .insert({
      collection_id: input.collectionId ?? null,
      project_id: input.projectId ?? null,
      user_id: ctx.user.id,
      title: input.title,
      status: "saved",
      summary: input.summary ?? null,
      memory: input.memory ?? {},
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const findingRows = (input.findings ?? []).map((finding) => ({
    session_id: data.id,
    user_id: ctx.user.id,
    finding_type: finding.findingType,
    title: finding.title,
    body: finding.body,
    citations: finding.citations ?? [],
    confidence: finding.confidence ?? "medium",
  }));
  const findingsResult = findingRows.length
    ? await ctx.supabase
        .from("research_session_findings")
        .insert(findingRows)
        .select("*")
    : { data: [], error: null };

  if (findingsResult.error) {
    throw new Error(findingsResult.error.message);
  }

  const session = mapResearchSession(
    data,
    (findingsResult.data ?? []).map(mapResearchSessionFinding),
  );
  await recordAction(ctx, {
    action: "research_session.save",
    targetType: input.collectionId ? "collection" : "project",
    targetId: input.collectionId ?? input.projectId ?? null,
    metadata: {
      sessionId: session.id,
      findings: session.findings.length,
    },
  });

  return session;
}

export async function getUsageAnalytics(
  ctx: ResearchContext,
): Promise<UsageAnalytics> {
  if (ctx.mode === "demo") {
    return getDemoUsageAnalytics();
  }

  const { data, error } = await ctx.supabase
    .from("ai_usage_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  const metrics = (data ?? []).map(mapUsageMetric);
  const totalTokens = metrics.reduce((sum, metric) => sum + metric.tokenEstimate, 0);
  const totalLatency = metrics.reduce((sum, metric) => sum + metric.latencyMs, 0);
  const totalChunks = metrics.reduce((sum, metric) => sum + metric.chunkCount, 0);
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
    retrievalEfficiency: totalChunks
      ? Math.min(1, Math.max(0.1, metrics.length / totalChunks))
      : 0,
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

export async function recordAction(
  ctx: ResearchContext,
  input: {
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (ctx.mode === "demo") {
    return;
  }

  const { error } = await ctx.supabase.from("action_records").insert({
    user_id: ctx.user.id,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.warn("Action record failed:", error.message);
  }
}
