import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/config";
import { embedText, vectorLiteral } from "@/lib/ai/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addDemoCollectionQa,
  addDemoHighlight,
  addDemoNote,
  addDemoQa,
  addDemoUsageMetric,
  attachDemoProjectToCollection,
  createDemoProjectFromDocument,
  createDemoCollection,
  createDemoPipelineRun,
  getDemoCollection,
  getDemoCollectionChunks,
  getDemoOutput,
  getDemoProject,
  getDemoUsageAnalytics,
  listDemoProjects,
  listDemoCollections,
  saveDemoOutput,
  saveDemoKnowledge,
  saveDemoSynthesisReport,
  toggleDemoPin,
} from "@/lib/research/demo-store";
import type {
  Citation,
  CollectionDetail,
  CollectionDocument,
  CollectionQaMessage,
  DocumentChunk,
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
) {
  if (ctx.mode === "demo") {
    return createDemoCollection(name, description);
  }

  const { data, error } = await ctx.supabase
    .from("research_collections")
    .insert({
      user_id: ctx.user.id,
      name,
      description: description ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCollection(data);
}

export async function getProjectDetail(
  ctx: ResearchContext,
  projectId: string,
): Promise<ProjectDetail | null> {
  if (ctx.mode === "demo") {
    return getDemoProject(projectId);
  }

  const [projectResult, documentsResult, chunksResult, outputsResult, notesResult, highlightsResult, qaResult] =
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

  return {
    ...mapProject(projectResult.data),
    documents: (documentsResult.data ?? []).map(mapDocument),
    chunks: (chunksResult.data ?? []).map(mapChunk),
    outputs,
    notes: (notesResult.data ?? []).map(mapNote),
    highlights: (highlightsResult.data ?? []).map(mapHighlight),
    qa: (qaResult.data ?? []).map(mapQa),
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
  return mapCollectionDocument(data);
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
    reportsResult,
    entitiesResult,
    insightsResult,
    claimsResult,
    qaResult,
    runsResult,
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
  ]);

  if (collectionResult.error) {
    throw new Error(collectionResult.error.message);
  }

  if (!collectionResult.data) {
    return null;
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
    ...mapCollection(collectionResult.data),
    documents: (documentsResult.data ?? []).map(mapCollectionDocument),
    reports: (reportsResult.data ?? []).map(mapSynthesisReport),
    entities: (entitiesResult.data ?? []).map(mapKnowledgeEntity),
    insights: (insightsResult.data ?? []).map(mapLinkedInsight),
    claims: (claimsResult.data ?? []).map(mapResearchClaim),
    qa: (qaResult.data ?? []).map(mapCollectionQa),
    pipelineRuns: (runsResult.data ?? []).map((run) =>
      mapPipelineRun(run, stepsByRun.get(run.id as string) ?? []),
    ),
  };
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

  return detail;
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
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  );
}

function lexicalRetrieve(chunks: DocumentChunk[], question: string, count: number) {
  const questionTokens = tokenize(question);

  return chunks
    .map((chunk) => {
      const contentTokens = tokenize(chunk.content);
      let overlap = 0;
      for (const token of questionTokens) {
        if (contentTokens.has(token)) {
          overlap += 1;
        }
      }

      const phraseBoost = chunk.content
        .toLowerCase()
        .includes(question.toLowerCase().slice(0, 32))
        ? 2
        : 0;

      return {
        ...chunk,
        similarity:
          questionTokens.size === 0
            ? 0
            : (overlap + phraseBoost) / questionTokens.size,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, count);
}

export async function retrieveRelevantChunks(
  ctx: ResearchContext,
  projectId: string,
  question: string,
  count = 6,
): Promise<RetrievalHit[]> {
  if (ctx.mode === "supabase") {
    const embedding = await embedText(question);

    if (embedding) {
      const { data, error } = await ctx.supabase.rpc("match_document_chunks", {
        match_project_id: projectId,
        query_embedding: vectorLiteral(embedding),
        match_count: count,
      });

      if (!error && data?.length) {
        return data.map((row: DbRow) => ({
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
          question,
          perProject,
        );

        return hits.map((hit) => ({
          ...hit,
          documentTitle: document.fileName ?? null,
          projectTitle: document.projectTitle,
        }));
      }),
    );

    const hits = groupedHits
      .flat()
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count);

    if (hits.length) {
      return hits;
    }
  }

  const chunks = await getCollectionChunks(ctx, collectionId);
  return lexicalRetrieve(chunks, question, count);
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

  return mapQa(data);
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

  return mapSynthesisReport(data);
}

export async function saveCollectionKnowledge(
  ctx: ResearchContext,
  input: {
    collectionId: string;
    entities: Array<Omit<KnowledgeEntity, "id" | "createdAt" | "collectionId">>;
    insights: Array<Omit<LinkedInsight, "id" | "createdAt" | "collectionId">>;
    claims: Array<Omit<ResearchClaim, "id" | "createdAt" | "collectionId">>;
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

  return {
    entities: (entitiesResult.data ?? []).map(mapKnowledgeEntity),
    insights: (insightsResult.data ?? []).map(mapLinkedInsight),
    claims: (claimsResult.data ?? []).map(mapResearchClaim),
  };
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

  return mapCollectionQa(data);
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
