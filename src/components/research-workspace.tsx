"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Bot,
  Brain,
  CheckCircle2,
  FileText,
  Highlighter,
  KeyRound,
  Layers3,
  Loader2,
  LogOut,
  MessageSquareText,
  NotebookPen,
  Pin,
  Search,
  Send,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import clsx from "clsx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  DocumentChunk,
  ProjectDetail,
  ResearchProject,
  SummaryDepth,
} from "@/lib/research/types";

type ResearchWorkspaceProps = {
  supabaseConfigured: boolean;
  demoAi: boolean;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: { message: string };
};

type SummaryOutput = {
  title?: string;
  abstract?: string;
  sections?: Array<{ heading: string; content: string }>;
  keyTakeaways?: string[];
  tokenStrategy?: string;
};

type InsightsOutput = {
  keyFindings?: Array<{
    finding: string;
    evidence: string;
    confidence: string;
  }>;
  entities?: Array<{ name: string; type: string; relevance: string }>;
  claims?: Array<{ claim: string; evidence: string }>;
  contradictions?: Array<{ issue: string; whyItMatters: string }>;
  gaps?: string[];
};

type KeywordsOutput = {
  rankedKeywords?: Array<{
    keyword: string;
    score: number;
    rationale: string;
  }>;
  topicClusters?: Array<{
    label: string;
    keywords: string[];
    summary: string;
  }>;
  semanticTags?: string[];
};

async function requestJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return payload.data as T;
}

function outputAs<T>(value: unknown) {
  return (value ?? {}) as T;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ProcessingRail({ steps }: { steps: string[] }) {
  if (!steps.length) {
    return null;
  }

  return (
    <div className="space-y-2 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-2">
          {index === steps.length - 1 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          )}
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
}

function JsonPreview({ value }: { value: unknown }) {
  return (
    <pre className="max-h-72 overflow-auto border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

export function ResearchWorkspace({
  supabaseConfigured,
  demoAi,
}: ResearchWorkspaceProps) {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "insights" | "keywords">(
    "summary",
  );
  const [summaryDepth, setSummaryDepth] = useState<SummaryDepth>("detailed");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [question, setQuestion] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState("");

  const supabase = useMemo(
    () => (supabaseConfigured ? createSupabaseBrowserClient() : null),
    [supabaseConfigured],
  );

  const summary = outputAs<SummaryOutput>(activeProject?.outputs.summary);
  const insights = outputAs<InsightsOutput>(activeProject?.outputs.insights);
  const keywords = outputAs<KeywordsOutput>(activeProject?.outputs.keywords);
  const pinnedAnswers = activeProject?.qa.filter((item) => item.pinned) ?? [];

  async function loadProject(projectId: string) {
    setError("");
    const data = await requestJson<{ project: ProjectDetail }>(
      `/api/projects/${projectId}`,
    );
    setActiveProject(data.project);
  }

  async function loadProjects() {
    setError("");
    const data = await requestJson<{
      projects: ResearchProject[];
      mode: "demo" | "supabase";
    }>("/api/projects");
    setProjects(data.projects);

    if (data.projects[0]) {
      await loadProject(data.projects[0].id);
    }
  }

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const data = await requestJson<{
          projects: ResearchProject[];
          mode: "demo" | "supabase";
        }>("/api/projects");

        if (!mounted) {
          return;
        }

        setProjects(data.projects);

        if (data.projects[0]) {
          const detail = await requestJson<{ project: ProjectDetail }>(
            `/api/projects/${data.projects[0].id}`,
          );

          if (mounted) {
            setActiveProject(detail.project);
          }
        }
      } catch (nextError) {
        if (mounted) {
          setError(nextError instanceof Error ? nextError.message : "Load failed.");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }

    setBusyAction("upload");
    setSteps(["Reading file", "Extracting text"]);
    setError("");

    try {
      const form = new FormData();
      form.set("file", selectedFile);
      form.set("title", uploadTitle);

      setSteps(["Reading file", "Extracting text", "Chunking and embedding"]);
      const data = await requestJson<{ project: ProjectDetail }>(
        "/api/upload-document",
        {
          method: "POST",
          body: form,
        },
      );

      setSteps(["Reading file", "Extracting text", "Chunking and embedding", "Opening workspace"]);
      setActiveProject(data.project);
      setSelectedFile(null);
      setUploadTitle("");
      await loadProjects();
      await loadProject(data.project.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Upload failed.");
    } finally {
      setBusyAction(null);
      setSteps([]);
    }
  }

  async function runSummary() {
    if (!activeProject) {
      return;
    }

    setBusyAction("summary");
    setSteps(["Checking cached summary", "Summarizing chunks", "Synthesizing report"]);
    setError("");

    try {
      await requestJson("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject.id,
          depth: summaryDepth,
        }),
      });
      await loadProject(activeProject.id);
      setActiveTab("summary");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Summary failed.",
      );
    } finally {
      setBusyAction(null);
      setSteps([]);
    }
  }

  async function runInsights() {
    if (!activeProject) {
      return;
    }

    setBusyAction("insights");
    setSteps(["Checking cached extraction", "Finding claims", "Mapping gaps"]);
    setError("");

    try {
      await requestJson("/api/extract-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id }),
      });
      await loadProject(activeProject.id);
      setActiveTab("insights");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Insight extraction failed.",
      );
    } finally {
      setBusyAction(null);
      setSteps([]);
    }
  }

  async function runKeywords() {
    if (!activeProject) {
      return;
    }

    setBusyAction("keywords");
    setSteps(["Checking cached tags", "Ranking keywords", "Clustering topics"]);
    setError("");

    try {
      await requestJson("/api/generate-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id }),
      });
      await loadProject(activeProject.id);
      setActiveTab("keywords");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Keyword generation failed.",
      );
    } finally {
      setBusyAction(null);
      setSteps([]);
    }
  }

  async function askQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeProject || !question.trim()) {
      return;
    }

    setBusyAction("chat");
    setSteps(["Embedding question", "Retrieving chunks", "Generating cited answer"]);
    setError("");

    try {
      await requestJson("/api/chat-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject.id,
          question,
        }),
      });
      setQuestion("");
      await loadProject(activeProject.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Chat failed.");
    } finally {
      setBusyAction(null);
      setSteps([]);
    }
  }

  async function saveNote() {
    if (!activeProject || !noteDraft.trim()) {
      return;
    }

    setBusyAction("note");
    setError("");

    try {
      await requestJson(`/api/projects/${activeProject.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteDraft }),
      });
      setNoteDraft("");
      await loadProject(activeProject.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Note failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function saveHighlight(chunk: DocumentChunk) {
    if (!activeProject) {
      return;
    }

    setBusyAction(`highlight-${chunk.id}`);
    setError("");

    try {
      await requestJson(`/api/projects/${activeProject.id}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chunkId: chunk.id,
          quote: chunk.content.slice(0, 700),
        }),
      });
      await loadProject(activeProject.id);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Highlight failed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function togglePinned(messageId: string) {
    if (!activeProject) {
      return;
    }

    setBusyAction(`pin-${messageId}`);

    try {
      await requestJson(`/api/projects/${activeProject.id}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      await loadProject(activeProject.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Pin failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function exportReport(format: "markdown" | "json") {
    if (!activeProject) {
      return;
    }

    setBusyAction(`export-${format}`);
    setError("");

    try {
      const data = await requestJson<{
        fileName: string;
        payload: string;
        format: "markdown" | "json";
      }>("/api/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, format }),
      });

      const blob = new Blob([data.payload], {
        type: format === "json" ? "application/json" : "text/markdown",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = data.fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Export failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-slate-950">
      <header className="border-b border-slate-300 bg-white">
        <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center bg-slate-950 text-white">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">ResearchOS</h1>
              <p className="text-sm text-slate-500">
                AI research intelligence workspace
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm text-emerald-800">
              {supabaseConfigured ? "Supabase Auth" : "Demo workspace"}
            </span>
            <span className="border border-sky-300 bg-sky-50 px-3 py-1 text-sm text-sky-800">
              {demoAi ? "Demo AI fallback" : "Live AI provider"}
            </span>
            {supabaseConfigured ? (
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-2 border border-slate-300 px-3 py-1 text-sm text-slate-700"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[280px_minmax(0,1fr)_420px] lg:p-6">
        <aside className="space-y-4">
          <form
            onSubmit={handleUpload}
            className="space-y-3 border border-slate-300 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Ingest</h2>
              <UploadCloud className="h-4 w-4 text-emerald-700" />
            </div>
            <label className="block cursor-pointer border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              <input
                className="sr-only"
                type="file"
                accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) =>
                  setSelectedFile(event.target.files?.[0] ?? null)
                }
              />
              <span className="font-medium text-slate-900">
                {selectedFile ? selectedFile.name : "Choose PDF, TXT, or DOCX"}
              </span>
              <span className="mt-1 block text-xs">
                Stored in Supabase Storage when configured.
              </span>
            </label>
            <input
              className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-700"
              placeholder="Project title"
              value={uploadTitle}
              onChange={(event) => setUploadTitle(event.target.value)}
            />
            <button
              type="submit"
              disabled={!selectedFile || busyAction === "upload"}
              className="inline-flex w-full items-center justify-center gap-2 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busyAction === "upload" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Upload document
            </button>
          </form>

          <section className="border border-slate-300 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold">Projects</h2>
              <Layers3 className="h-4 w-4 text-slate-500" />
            </div>
            <div className="max-h-[34rem] overflow-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => loadProject(project.id)}
                  className={clsx(
                    "block w-full border-b border-slate-200 px-4 py-3 text-left text-sm",
                    activeProject?.id === project.id
                      ? "bg-emerald-50 text-emerald-950"
                      : "bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="block font-medium">{project.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {project.documentCount} document - {formatDate(project.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="min-w-0 space-y-4">
          {error ? (
            <div className="border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
              {error}
            </div>
          ) : null}
          <ProcessingRail steps={steps} />

          <div className="border border-slate-300 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Research Project
                </p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {activeProject?.title ?? "No project loaded"}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => exportReport("markdown")}
                  disabled={!activeProject || busyAction === "export-markdown"}
                  className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => exportReport("json")}
                  disabled={!activeProject || busyAction === "export-json"}
                  className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  <ArrowDownToLine className="h-4 w-4" />
                  JSON
                </button>
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-3">
              <div className="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Chunks
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {activeProject?.chunks.length ?? 0}
                </p>
              </div>
              <div className="border-b border-slate-200 p-4 md:border-b-0 md:border-r">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Notes
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {activeProject?.notes.length ?? 0}
                </p>
              </div>
              <div className="p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Pinned Answers
                </p>
                <p className="mt-1 text-2xl font-semibold">
                  {pinnedAnswers.length}
                </p>
              </div>
            </div>
          </div>

          <section className="border border-slate-300 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4 text-slate-600" />
                Document Viewer
              </h2>
              <span className="text-xs text-slate-500">
                {activeProject?.documents[0]?.fileName ?? "No document"}
              </span>
            </div>
            <div className="max-h-[34rem] space-y-3 overflow-auto p-4">
              {activeProject?.chunks.map((chunk) => (
                <article
                  key={chunk.id}
                  className="border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Chunk {chunk.chunkIndex}
                      </p>
                      {chunk.sectionTitle ? (
                        <h3 className="text-sm font-semibold text-slate-900">
                          {chunk.sectionTitle}
                        </h3>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => saveHighlight(chunk)}
                      className="inline-flex items-center gap-1 border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      {busyAction === `highlight-${chunk.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Highlighter className="h-3.5 w-3.5" />
                      )}
                      Highlight
                    </button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {chunk.content}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <section className="border border-slate-300 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                AI Outputs
              </h2>
            </div>
            <div className="grid grid-cols-3 border-b border-slate-200 text-sm">
              {(["summary", "insights", "keywords"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "px-3 py-2 font-semibold capitalize",
                    activeTab === tab
                      ? "bg-slate-950 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                <select
                  value={summaryDepth}
                  onChange={(event) =>
                    setSummaryDepth(event.target.value as SummaryDepth)
                  }
                  className="border border-slate-300 px-2 py-2 text-sm"
                  aria-label="Summary depth"
                >
                  <option value="short">Short</option>
                  <option value="detailed">Detailed</option>
                  <option value="executive">Executive</option>
                </select>
                <button
                  type="button"
                  onClick={runSummary}
                  disabled={!activeProject || busyAction === "summary"}
                  className="inline-flex items-center gap-2 bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Bot className="h-4 w-4" />
                  Summary
                </button>
                <button
                  type="button"
                  onClick={runInsights}
                  disabled={!activeProject || busyAction === "insights"}
                  className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold"
                >
                  <Search className="h-4 w-4" />
                  Insights
                </button>
                <button
                  type="button"
                  onClick={runKeywords}
                  disabled={!activeProject || busyAction === "keywords"}
                  className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold"
                >
                  <KeyRound className="h-4 w-4" />
                  Keywords
                </button>
              </div>

              {activeTab === "summary" ? (
                <div className="space-y-3">
                  {summary.abstract ? (
                    <>
                      <h3 className="text-lg font-semibold">
                        {summary.title ?? "Summary"}
                      </h3>
                      <p className="text-sm leading-6 text-slate-700">
                        {summary.abstract}
                      </p>
                      <div className="space-y-2">
                        {(summary.keyTakeaways ?? []).map((takeaway) => (
                          <p
                            key={takeaway}
                            className="border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
                          >
                            {takeaway}
                          </p>
                        ))}
                      </div>
                      {(summary.sections ?? []).map((section) => (
                        <div key={section.heading}>
                          <h4 className="text-sm font-semibold">
                            {section.heading}
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {section.content}
                          </p>
                        </div>
                      ))}
                    </>
                  ) : (
                    <JsonPreview value={summary} />
                  )}
                </div>
              ) : null}

              {activeTab === "insights" ? (
                <div className="space-y-3">
                  {(insights.keyFindings ?? []).map((finding) => (
                    <div
                      key={finding.finding}
                      className="border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-semibold">{finding.finding}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {finding.evidence}
                      </p>
                    </div>
                  ))}
                  {(insights.gaps ?? []).length ? (
                    <div>
                      <h4 className="text-sm font-semibold">Gaps</h4>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        {(insights.gaps ?? []).map((gap) => (
                          <li key={gap}>- {gap}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {!insights.keyFindings?.length ? <JsonPreview value={insights} /> : null}
                </div>
              ) : null}

              {activeTab === "keywords" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(keywords.semanticTags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {(keywords.rankedKeywords ?? []).map((keyword) => (
                    <div
                      key={keyword.keyword}
                      className="border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{keyword.keyword}</p>
                        <span className="text-xs text-slate-500">
                          {Math.round(keyword.score * 100)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {keyword.rationale}
                      </p>
                    </div>
                  ))}
                  {!keywords.rankedKeywords?.length ? <JsonPreview value={keywords} /> : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="border border-slate-300 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <MessageSquareText className="h-4 w-4 text-sky-700" />
                Q&A
              </h2>
            </div>
            <form onSubmit={askQuestion} className="flex gap-2 border-b border-slate-200 p-3">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700"
                placeholder="Ask this document a research question"
              />
              <button
                type="submit"
                disabled={!activeProject || busyAction === "chat"}
                className="inline-flex items-center justify-center bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
                aria-label="Ask question"
              >
                {busyAction === "chat" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
            <div className="max-h-[28rem] space-y-3 overflow-auto p-3">
              {activeProject?.qa.map((message) => (
                <article
                  key={message.id}
                  className="border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">{message.question}</h3>
                    <button
                      type="button"
                      onClick={() => togglePinned(message.id)}
                      className={clsx(
                        "border px-2 py-1",
                        message.pinned
                          ? "border-amber-400 bg-amber-100 text-amber-900"
                          : "border-slate-300 bg-white text-slate-600",
                      )}
                      aria-label="Pin answer"
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {message.answer}
                  </p>
                  {message.citations.length ? (
                    <div className="mt-3 space-y-1">
                      {message.citations.slice(0, 3).map((citation) => (
                        <p
                          key={`${message.id}-${citation.chunkIndex}-${citation.quote}`}
                          className="border-l-2 border-sky-600 bg-white px-2 py-1 text-xs leading-5 text-slate-600"
                        >
                          Chunk {citation.chunkIndex}: {citation.quote}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="border border-slate-300 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <NotebookPen className="h-4 w-4 text-emerald-700" />
                Notes
              </h2>
            </div>
            <div className="space-y-3 p-3">
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                className="min-h-24 w-full border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700"
                placeholder="Capture a reusable research note"
              />
              <button
                type="button"
                onClick={saveNote}
                disabled={!activeProject || !noteDraft.trim() || busyAction === "note"}
                className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                <NotebookPen className="h-4 w-4" />
                Save note
              </button>
              <div className="space-y-2">
                {activeProject?.notes.slice(0, 5).map((note) => (
                  <div
                    key={note.id}
                    className="border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-sm font-semibold">{note.title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-700">
                      {note.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
