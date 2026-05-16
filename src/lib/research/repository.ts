import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/config";
import { embedText, vectorLiteral } from "@/lib/ai/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addDemoHighlight,
  addDemoNote,
  addDemoQa,
  createDemoProjectFromDocument,
  getDemoOutput,
  getDemoProject,
  listDemoProjects,
  saveDemoOutput,
  toggleDemoPin,
} from "@/lib/research/demo-store";
import type {
  Citation,
  DocumentChunk,
  Highlight,
  ProjectDetail,
  QaMessage,
  ResearchDocument,
  ResearchNote,
  ResearchProject,
  RetrievalHit,
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
