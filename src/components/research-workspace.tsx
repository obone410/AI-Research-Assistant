"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  BarChart3,
  Bot,
  Brain,
  CheckCircle2,
  Command,
  FileText,
  GitCompareArrows,
  Highlighter,
  KeyRound,
  Layers3,
  LineChart,
  Loader2,
  LogOut,
  MessageSquareText,
  Network,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Send,
  Sparkles,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react";
import clsx from "clsx";
import { KnowledgeGraph } from "@/components/knowledge-graph";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Citation,
  CollectionDetail,
  DocumentChunk,
  KnowledgeEntity,
  ProjectDetail,
  ResearchCollection,
  ResearchProject,
  SummaryDepth,
  SynthesisReportKind,
  UsageAnalytics,
} from "@/lib/research/types";

type ResearchWorkspaceProps = {
  supabaseConfigured: boolean;
  demoAi: boolean;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: { message: string };
};

type WorkspaceView =
  | "project"
  | "collections"
  | "knowledge"
  | "chat"
  | "intelligence"
  | "analytics";

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

type SynthesisOutput = {
  title?: string;
  overview?: string;
  combinedSummary?: string;
  sourceComparisons?: Array<{
    source: string;
    contribution: string;
    notableDifference: string;
  }>;
  overlappingIdeas?: string[];
  keyThemes?: string[];
  sharedClaims?: string[];
  conflictingPoints?: string[];
  recommendedNextQuestions?: string[];
  opportunities?: string[];
  keyTakeaways?: string[];
  sourceTensions?: Array<{
    topic: string;
    explanation: string;
    citations: Citation[];
  }>;
  recommendations?: string[];
  confidenceScore?: number;
  evidenceStrength?: "weak" | "moderate" | "strong";
  sourceReliability?: Array<{
    source: string;
    score: number;
    rationale: string;
  }>;
  hypotheses?: string[];
  claimValidation?: Array<{
    claim: string;
    status: "supported" | "conflicting" | "unanswered";
    explanation: string;
    citations?: Citation[];
  }>;
  unansweredQuestions?: string[];
  conflictingEvidence?: Array<{
    topic: string;
    explanation: string;
    citations?: Citation[];
  }>;
  missingTopics?: string[];
  emergingTrends?: string[];
  suggestedInvestigations?: string[];
  citations?: Citation[];
  confidence?: string;
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

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function labelFromKind(kind: SynthesisReportKind) {
  return {
    combined_summary: "Unified Report",
    source_comparison: "Compare Sources",
    executive_brief: "Executive Brief",
    trend_analysis: "Key Trends",
    research_gaps: "Research Gaps",
    contradiction_analysis: "Contradictions",
    opportunity_analysis: "Opportunities",
    key_takeaways: "Key Takeaways",
    recommendation_summary: "Recommendations",
    confidence_report: "Confidence Report",
    hypothesis_generation: "Hypotheses",
    claim_validation: "Claim Validation",
    evidence_summary: "Evidence Summary",
    strategic_insight_report: "Strategic Insights",
    analytical_briefing: "Analytical Briefing",
    collection_comparison_report: "Collection Report",
  }[kind];
}

const coreReportKinds: SynthesisReportKind[] = [
  "combined_summary",
  "source_comparison",
  "executive_brief",
  "trend_analysis",
  "research_gaps",
];

const analystReportKinds: SynthesisReportKind[] = [
  "contradiction_analysis",
  "opportunity_analysis",
  "key_takeaways",
  "recommendation_summary",
];

const reasoningReportKinds: SynthesisReportKind[] = [
  "confidence_report",
  "hypothesis_generation",
  "claim_validation",
  "evidence_summary",
  "strategic_insight_report",
  "analytical_briefing",
  "collection_comparison_report",
];

function confidenceClass(confidence?: string) {
  if (confidence === "high") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }

  if (confidence === "low") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }

  return "border-sky-300 bg-sky-50 text-sky-800";
}

function confidencePercent(output: SynthesisOutput) {
  if (typeof output.confidenceScore === "number") {
    return Math.round(output.confidenceScore * 100);
  }

  if (output.confidence === "high") {
    return 82;
  }

  if (output.confidence === "low") {
    return 38;
  }

  return 64;
}

function entityMatchesText(entity: KnowledgeEntity, text: string) {
  return text.toLowerCase().includes(entity.name.toLowerCase());
}

function citationTitle(citation: Citation) {
  const source =
    citation.projectTitle ?? citation.documentTitle ?? `Chunk ${citation.chunkIndex}`;
  return `${source} / chunk ${citation.chunkIndex}`;
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

function EmptyState({ title }: { title: string }) {
  return (
    <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
      {title}
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "emerald" | "sky" | "amber";
}) {
  const toneClass = {
    slate: "border-slate-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50",
    sky: "border-sky-200 bg-sky-50",
    amber: "border-amber-200 bg-amber-50",
  }[tone];

  return (
    <div className={clsx("border p-4", toneClass)}>
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export function ResearchWorkspace({
  supabaseConfigured,
  demoAi,
}: ResearchWorkspaceProps) {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [collections, setCollections] = useState<ResearchCollection[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectDetail | null>(null);
  const [activeCollection, setActiveCollection] =
    useState<CollectionDetail | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("project");
  const [activeTab, setActiveTab] = useState<"summary" | "insights" | "keywords">(
    "summary",
  );
  const [summaryDepth, setSummaryDepth] = useState<SummaryDepth>("detailed");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [collectionNoteDraft, setCollectionNoteDraft] = useState("");
  const [question, setQuestion] = useState("");
  const [collectionQuestion, setCollectionQuestion] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [targetChunkId, setTargetChunkId] = useState<string | null>(null);
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
  const latestReport = activeCollection?.reports[0];
  const latestSynthesis = outputAs<SynthesisOutput>(latestReport?.output);
  const latestCollectionCitations =
    activeCollection?.qa[0]?.citations.length
      ? activeCollection.qa[0].citations
      : latestReport?.citations ?? [];
  const selectedEntity =
    activeCollection?.entities.find((entity) => entity.id === selectedEntityId) ??
    activeCollection?.entities[0] ??
    null;
  const relatedDocuments = selectedEntity
    ? activeCollection?.documentEntities.filter(
        (item) => item.entityId === selectedEntity.id,
      ) ?? []
    : [];
  const relatedRelationships = selectedEntity
    ? activeCollection?.relationships.filter(
        (item) =>
          item.sourceEntityId === selectedEntity.id ||
          item.targetEntityId === selectedEntity.id,
      ) ?? []
    : [];
  const relatedInsights = selectedEntity
    ? activeCollection?.insights.filter((insight) =>
        entityMatchesText(selectedEntity, `${insight.title} ${insight.body}`),
      ) ?? []
    : activeCollection?.insights.slice(0, 4) ?? [];
  const relatedClaims = selectedEntity
    ? activeCollection?.claims.filter((claim) =>
        entityMatchesText(selectedEntity, `${claim.claim} ${claim.evidence}`),
      ) ?? []
    : activeCollection?.claims.slice(0, 4) ?? [];
  const trendingEntities =
    activeCollection?.entities
      .slice()
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 6) ?? [];
  const recentlyDiscoveredConcepts =
    activeCollection?.entities
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6) ?? [];
  const proactiveQuestions = Array.from(
    new Set([
      ...(latestSynthesis.recommendedNextQuestions ?? []),
      ...(latestSynthesis.unansweredQuestions ?? []),
      ...relatedClaims.slice(0, 2).map((claim) => `Validate: ${claim.claim}`),
    ]),
  ).slice(0, 6);
  const proactiveSuggestions = Array.from(
    new Set([
      ...(latestSynthesis.suggestedInvestigations ?? []),
      ...(latestSynthesis.missingTopics ?? []).map(
        (topic) => `Add a source that covers ${topic}.`,
      ),
      ...relatedRelationships
        .slice(0, 3)
        .map(
          (relationship) =>
            `Explore ${relationship.sourceName} ${relationship.relation} ${relationship.targetName}.`,
        ),
    ]),
  ).slice(0, 6);
  const contradictionAlerts = [
    ...(latestSynthesis.conflictingEvidence ?? []).map((item) => ({
      title: item.topic,
      body: item.explanation,
    })),
    ...(latestSynthesis.sourceTensions ?? []).map((item) => ({
      title: item.topic,
      body: item.explanation,
    })),
    ...(activeCollection?.claims ?? [])
      .filter((claim) => claim.stance === "challenges")
      .slice(0, 3)
      .map((claim) => ({
        title: "Challenged claim",
        body: claim.claim,
      })),
  ].slice(0, 6);
  const activityFeed = [
    ...(activeCollection?.reports ?? []).map((report) => ({
      id: `report-${report.id}`,
      label: labelFromKind(report.kind),
      title: report.title,
      createdAt: report.createdAt,
    })),
    ...(activeCollection?.qa ?? []).map((message) => ({
      id: `qa-${message.id}`,
      label: "Research Chat",
      title: message.question,
      createdAt: message.createdAt,
    })),
    ...(activeCollection?.notes ?? []).map((note) => ({
      id: `note-${note.id}`,
      label: "Saved Note",
      title: note.title,
      createdAt: note.createdAt,
    })),
    ...(activeCollection?.pipelineRuns ?? []).map((run) => ({
      id: `run-${run.id}`,
      label: "Pipeline",
      title: run.name,
      createdAt: run.createdAt,
    })),
    ...(activeCollection?.sessions ?? []).map((session) => ({
      id: `session-${session.id}`,
      label: "Research Session",
      title: session.title,
      createdAt: session.updatedAt,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  async function loadProject(projectId: string) {
    setError("");
    const data = await requestJson<{ project: ProjectDetail }>(
      `/api/projects/${projectId}`,
    );
    setActiveProject(data.project);
  }

  async function loadProjects(selectFirst = false) {
    setError("");
    const data = await requestJson<{
      projects: ResearchProject[];
      mode: "demo" | "supabase";
    }>("/api/projects");
    setProjects(data.projects);

    if (selectFirst && data.projects[0]) {
      await loadProject(data.projects[0].id);
    }
  }

  async function loadCollection(collectionId: string) {
    setError("");
    const data = await requestJson<{ collection: CollectionDetail }>(
      `/api/collections/${collectionId}`,
    );
    setActiveCollection(data.collection);
  }

  async function loadCollections(selectFirst = false) {
    setError("");
    const data = await requestJson<{
      collections: ResearchCollection[];
      mode: "demo" | "supabase";
    }>("/api/collections");
    setCollections(data.collections);

    if (selectFirst && data.collections[0]) {
      await loadCollection(data.collections[0].id);
    }
  }

  async function loadAnalytics() {
    const data = await requestJson<{ analytics: UsageAnalytics }>("/api/analytics");
    setAnalytics(data.analytics);
  }

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const [projectData, collectionData, analyticsData] = await Promise.all([
          requestJson<{ projects: ResearchProject[]; mode: "demo" | "supabase" }>(
            "/api/projects",
          ),
          requestJson<{
            collections: ResearchCollection[];
            mode: "demo" | "supabase";
          }>("/api/collections"),
          requestJson<{ analytics: UsageAnalytics }>("/api/analytics"),
        ]);

        if (!mounted) {
          return;
        }

        setProjects(projectData.projects);
        setCollections(collectionData.collections);
        setAnalytics(analyticsData.analytics);

        if (projectData.projects[0]) {
          const detail = await requestJson<{ project: ProjectDetail }>(
            `/api/projects/${projectData.projects[0].id}`,
          );
          if (mounted) {
            setActiveProject(detail.project);
          }
        }

        if (collectionData.collections[0]) {
          const detail = await requestJson<{ collection: CollectionDetail }>(
            `/api/collections/${collectionData.collections[0].id}`,
          );
          if (mounted) {
            setActiveCollection(detail.collection);
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

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  useEffect(() => {
    if (!targetChunkId || workspaceView !== "project") {
      return;
    }

    const timer = window.setTimeout(() => {
      document
        .getElementById(`chunk-${targetChunkId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [activeProject, targetChunkId, workspaceView]);

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
      setWorkspaceView("project");
      setSelectedFile(null);
      setUploadTitle("");
      await loadProjects();
      await loadProject(data.project.id);
      await loadAnalytics();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Upload failed.");
    } finally {
      setBusyAction(null);
      setSteps([]);
    }
  }

  async function runSummary(depth = summaryDepth) {
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
          depth,
        }),
      });
      await loadProject(activeProject.id);
      setActiveTab("summary");
      await loadAnalytics();
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
      await loadAnalytics();
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
      await loadAnalytics();
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
      await loadAnalytics();
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

  async function saveCollectionNote() {
    if (!activeCollection || !collectionNoteDraft.trim()) {
      return;
    }

    setBusyAction("collection-note");
    setError("");

    try {
      await requestJson(`/api/collections/${activeCollection.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: collectionNoteDraft }),
      });
      setCollectionNoteDraft("");
      await loadCollection(activeCollection.id);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Collection note failed.",
      );
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

  async function createCollection(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!collectionName.trim()) {
      return;
    }

    setBusyAction("collection-create");
    setError("");

    try {
      const data = await requestJson<{ collection: ResearchCollection }>(
        "/api/collections",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: collectionName,
            description: collectionDescription || null,
          }),
        },
      );
      setCollectionName("");
      setCollectionDescription("");
      await loadCollections();
      await loadCollection(data.collection.id);
      setWorkspaceView("collections");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Collection failed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function attachActiveProject() {
    if (!activeProject || !activeCollection) {
      return;
    }

    setBusyAction("collection-attach");
    setError("");

    try {
      await requestJson(`/api/collections/${activeCollection.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id }),
      });
      await loadCollections();
      await loadCollection(activeCollection.id);
      setWorkspaceView("collections");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Attach failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function removeCollectionSource(linkId: string) {
    if (!activeCollection) {
      return;
    }

    setBusyAction(`collection-remove-${linkId}`);
    setError("");

    try {
      await requestJson(`/api/collections/${activeCollection.id}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkId }),
      });
      await loadCollections();
      await loadCollection(activeCollection.id);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Remove failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function runCollectionReport(kind: SynthesisReportKind) {
    if (!activeCollection) {
      return;
    }

    setBusyAction(`collection-${kind}`);
    setSteps(["Selecting source chunks", "Comparing documents", "Writing report"]);
    setError("");

    try {
      await requestJson(`/api/collections/${activeCollection.id}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      await loadCollection(activeCollection.id);
      await loadAnalytics();
      setWorkspaceView(
        reasoningReportKinds.includes(kind) ? "intelligence" : "collections",
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Report failed.");
    } finally {
      setBusyAction(null);
      setSteps([]);
    }
  }

  async function runKnowledgeExtraction() {
    if (!activeCollection) {
      return;
    }

    setBusyAction("collection-knowledge");
    setSteps(["Reading collection", "Extracting entities", "Linking insights"]);
    setError("");

    try {
      await requestJson(`/api/collections/${activeCollection.id}/knowledge`, {
        method: "POST",
      });
      await loadCollection(activeCollection.id);
      await loadAnalytics();
      setWorkspaceView("knowledge");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Knowledge extraction failed.",
      );
    } finally {
      setBusyAction(null);
      setSteps([]);
    }
  }

  async function askCollectionQuestion(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!activeCollection || !collectionQuestion.trim()) {
      return;
    }

    setBusyAction("collection-chat");
    setSteps(["Retrieving collection sources", "Composing answer", "Attaching references"]);
    setError("");

    try {
      await requestJson(`/api/collections/${activeCollection.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: collectionQuestion }),
      });
      setCollectionQuestion("");
      await loadCollection(activeCollection.id);
      await loadAnalytics();
      setWorkspaceView("chat");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Collection chat failed.",
      );
    } finally {
      setBusyAction(null);
      setSteps([]);
    }
  }

  async function saveInvestigationSession() {
    if (!activeCollection) {
      return;
    }

    setBusyAction("save-session");
    setError("");

    try {
      const findings = [
        ...(latestSynthesis.keyTakeaways ?? []).slice(0, 2).map((item) => ({
          findingType: "takeaway",
          title: "Key takeaway",
          body: item,
          citations: latestCollectionCitations.slice(0, 2),
          confidence: latestSynthesis.confidence === "high" ? "high" : "medium",
        })),
        ...contradictionAlerts.slice(0, 2).map((alert) => ({
          findingType: "contradiction",
          title: alert.title,
          body: alert.body,
          citations: latestCollectionCitations.slice(0, 2),
          confidence: "medium",
        })),
      ];

      await requestJson(`/api/collections/${activeCollection.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${activeCollection.name} research session`,
          summary:
            latestSynthesis.overview ??
            latestSynthesis.combinedSummary ??
            "Saved multi-document investigation context.",
          memory: {
            activeReport: latestReport?.id ?? null,
            selectedEntity: selectedEntity?.name ?? null,
            suggestedQuestions: proactiveQuestions,
            suggestedInvestigations: proactiveSuggestions,
          },
          findings,
        }),
      });
      await loadCollection(activeCollection.id);
      setWorkspaceView("intelligence");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Session save failed.",
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function exportReport(format: "markdown" | "json") {
    if (!activeProject && !activeCollection) {
      return;
    }

    const target =
      workspaceView === "project" || !activeCollection
        ? { projectId: activeProject?.id }
        : { collectionId: activeCollection.id };

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
        body: JSON.stringify({ ...target, format }),
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

  async function openCitation(citation: Citation) {
    if (citation.projectId) {
      setTargetChunkId(citation.chunkId);
      await loadProject(citation.projectId);
      setWorkspaceView("project");
    }
  }

  async function signOut() {
    await supabase?.auth.signOut();
    window.location.reload();
  }

  const viewItems: Array<{
    id: WorkspaceView;
    label: string;
    icon: typeof FileText;
  }> = [
    { id: "project", label: "Project", icon: FileText },
    { id: "collections", label: "Collections", icon: Layers3 },
    { id: "knowledge", label: "Knowledge", icon: Network },
    { id: "chat", label: "Research Chat", icon: MessageSquareText },
    { id: "intelligence", label: "Intelligence", icon: Activity },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-slate-950">
      <header className="border-b border-slate-300 bg-white">
        <div className="space-y-4 px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center bg-slate-950 text-white">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">ResearchOS</h1>
                <p className="text-sm text-slate-500">
                  Research intelligence workspace
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-700 sm:w-72"
                  placeholder="Search workspace"
                />
              </div>
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold"
              >
                <Command className="h-4 w-4" />
                Command
              </button>
              <span className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {supabaseConfigured ? "Supabase" : "Demo"}
              </span>
              <span className="border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                {demoAi ? "Demo AI" : "Live AI"}
              </span>
              {supabaseConfigured ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm text-slate-700"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              ) : null}
            </div>
          </div>

          <nav className="flex gap-2 overflow-auto">
            {viewItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setWorkspaceView(item.id)}
                  className={clsx(
                    "inline-flex shrink-0 items-center gap-2 border px-3 py-2 text-sm font-semibold",
                    workspaceView === item.id
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="grid gap-4 p-4 xl:grid-cols-[300px_minmax(0,1fr)_420px] lg:p-6">
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

          <form
            onSubmit={createCollection}
            className="space-y-3 border border-slate-300 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Collection</h2>
              <Plus className="h-4 w-4 text-sky-700" />
            </div>
            <input
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700"
              placeholder="Collection name"
            />
            <input
              value={collectionDescription}
              onChange={(event) => setCollectionDescription(event.target.value)}
              className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700"
              placeholder="Description"
            />
            <button
              type="submit"
              disabled={!collectionName.trim() || busyAction === "collection-create"}
              className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              New collection
            </button>
          </form>

          <section className="border border-slate-300 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold">Projects</h2>
              <FileText className="h-4 w-4 text-slate-500" />
            </div>
            <div className="max-h-72 overflow-auto">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={async () => {
                    await loadProject(project.id);
                    setWorkspaceView("project");
                  }}
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
              {!filteredProjects.length ? <EmptyState title="No projects found." /> : null}
            </div>
          </section>

          <section className="border border-slate-300 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="font-semibold">Collections</h2>
              <Layers3 className="h-4 w-4 text-slate-500" />
            </div>
            <div className="max-h-72 overflow-auto">
              {filteredCollections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={async () => {
                    await loadCollection(collection.id);
                    setWorkspaceView("collections");
                  }}
                  className={clsx(
                    "block w-full border-b border-slate-200 px-4 py-3 text-left text-sm",
                    activeCollection?.id === collection.id
                      ? "bg-sky-50 text-sky-950"
                      : "bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="block font-medium">{collection.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {collection.projectCount} sources - {formatDate(collection.createdAt)}
                  </span>
                </button>
              ))}
              {!filteredCollections.length ? (
                <EmptyState title="No collections found." />
              ) : null}
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

          {workspaceView === "project" ? (
            <>
              <section className="border border-slate-300 bg-white">
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
                      onClick={attachActiveProject}
                      disabled={!activeProject || !activeCollection || busyAction === "collection-attach"}
                      className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <Layers3 className="h-4 w-4" />
                      Add to collection
                    </button>
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

                <div className="grid gap-0 md:grid-cols-5">
                  <MetricTile label="Chunks" value={activeProject?.chunks.length ?? 0} />
                  <MetricTile label="Notes" value={activeProject?.notes.length ?? 0} />
                  <MetricTile label="Pinned" value={pinnedAnswers.length} />
                  <MetricTile
                    label="Tokens"
                    value={compactNumber(activeProject?.documents[0]?.tokenCount ?? 0)}
                  />
                </div>
              </section>

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
                <div className="max-h-[42rem] space-y-3 overflow-auto p-4">
                  {activeProject?.chunks.map((chunk) => (
                    <article
                      key={chunk.id}
                      id={`chunk-${chunk.id}`}
                      className={clsx(
                        "border p-3 transition-colors",
                        targetChunkId === chunk.id
                          ? "border-amber-400 bg-amber-50"
                          : "border-slate-200 bg-slate-50",
                      )}
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
                  {!activeProject?.chunks.length ? (
                    <EmptyState title="Upload a document to start." />
                  ) : null}
                </div>
              </section>
            </>
          ) : null}

          {workspaceView === "collections" ? (
            <section className="space-y-4">
              <div className="border border-slate-300 bg-white">
                <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Collection Dashboard
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      {activeCollection?.name ?? "No collection loaded"}
                    </h2>
                    {activeCollection?.description ? (
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                        {activeCollection.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...coreReportKinds, ...analystReportKinds, ...reasoningReportKinds].map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => runCollectionReport(kind)}
                        disabled={!activeCollection || busyAction === `collection-${kind}`}
                        className={clsx(
                          "inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold disabled:opacity-50",
                          kind === "combined_summary"
                            ? "bg-slate-950 text-white"
                            : "border border-slate-300 bg-white",
                        )}
                      >
                        {kind === "source_comparison" ? (
                          <GitCompareArrows className="h-4 w-4" />
                        ) : (
                          <WandSparkles className="h-4 w-4" />
                        )}
                        {labelFromKind(kind)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-0 md:grid-cols-4">
                  <MetricTile
                    label="Sources"
                    value={activeCollection?.documents.length ?? 0}
                    tone="sky"
                  />
                  <MetricTile
                    label="Reports"
                    value={activeCollection?.reports.length ?? 0}
                    tone="emerald"
                  />
                  <MetricTile
                    label="Insights"
                    value={activeCollection?.insights.length ?? 0}
                  />
                  <MetricTile
                    label="Claims"
                    value={activeCollection?.claims.length ?? 0}
                    tone="amber"
                  />
                  <MetricTile
                    label="Notes"
                    value={activeCollection?.notes.length ?? 0}
                    tone="emerald"
                  />
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <section className="border border-slate-300 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="font-semibold">Latest Report</h2>
                  </div>
                  <div className="space-y-4 p-4">
                    {latestReport ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="border border-slate-300 px-2 py-1 text-xs font-semibold">
                            {labelFromKind(latestReport.kind)}
                          </span>
                          <span className={clsx("border px-2 py-1 text-xs font-semibold", confidenceClass(latestSynthesis.confidence))}>
                            {latestSynthesis.confidence ?? "medium"} confidence
                          </span>
                        </div>
                        <h3 className="text-xl font-semibold">
                          {latestSynthesis.title ?? latestReport.title}
                        </h3>
                        <p className="text-sm leading-6 text-slate-700">
                          {latestSynthesis.overview ?? latestSynthesis.combinedSummary}
                        </p>
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              Confidence
                            </p>
                            <p className="mt-2 text-2xl font-semibold">
                              {confidencePercent(latestSynthesis)}%
                            </p>
                          </div>
                          <div className="border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              Evidence Strength
                            </p>
                            <p className="mt-2 text-lg font-semibold capitalize">
                              {latestSynthesis.evidenceStrength ?? "moderate"}
                            </p>
                          </div>
                          <div className="border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              Source Coverage
                            </p>
                            <p className="mt-2 text-lg font-semibold">
                              {(latestSynthesis.sourceReliability ?? []).length ||
                                activeCollection?.documents.length ||
                                0}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(latestSynthesis.overlappingIdeas ?? []).map((idea) => (
                            <p
                              key={idea}
                              className="border-l-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-emerald-950"
                            >
                              {idea}
                            </p>
                          ))}
                        </div>
                        {[
                          ["Key Themes", latestSynthesis.keyThemes],
                          ["Shared Claims", latestSynthesis.sharedClaims],
                          ["Conflicting Points", latestSynthesis.conflictingPoints],
                          ["Opportunities", latestSynthesis.opportunities],
                          ["Key Takeaways", latestSynthesis.keyTakeaways],
                          [
                            "Recommended Next Questions",
                            latestSynthesis.recommendedNextQuestions,
                          ],
                        ].some(([, items]) => (items as string[] | undefined)?.length) ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {[
                              ["Key Themes", latestSynthesis.keyThemes],
                              ["Shared Claims", latestSynthesis.sharedClaims],
                              ["Conflicting Points", latestSynthesis.conflictingPoints],
                              ["Opportunities", latestSynthesis.opportunities],
                              ["Key Takeaways", latestSynthesis.keyTakeaways],
                              [
                                "Recommended Next Questions",
                                latestSynthesis.recommendedNextQuestions,
                              ],
                            ].map(([label, items]) =>
                              (items as string[] | undefined)?.length ? (
                                <div
                                  key={label as string}
                                  className="border border-slate-200 bg-white p-3"
                                >
                                  <h4 className="text-sm font-semibold">
                                    {label as string}
                                  </h4>
                                  <div className="mt-2 space-y-2">
                                    {(items as string[]).map((item) => (
                                      <p
                                        key={item}
                                        className="text-sm leading-5 text-slate-700"
                                      >
                                        {item}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ) : null,
                            )}
                          </div>
                        ) : null}
                        <div className="grid gap-3 md:grid-cols-2">
                          {(latestSynthesis.sourceComparisons ?? []).map((item) => (
                            <article
                              key={`${item.source}-${item.contribution}`}
                              className="border border-slate-200 bg-slate-50 p-3"
                            >
                              <h4 className="text-sm font-semibold">{item.source}</h4>
                              <p className="mt-1 text-sm leading-5 text-slate-700">
                                {item.contribution}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                {item.notableDifference}
                              </p>
                            </article>
                          ))}
                        </div>
                        {(latestSynthesis.recommendations ?? []).length ? (
                          <div>
                            <h4 className="text-sm font-semibold">Recommendations</h4>
                            <div className="mt-2 space-y-2">
                              {(latestSynthesis.recommendations ?? []).map((item) => (
                                <p
                                  key={item}
                                  className="border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                                >
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {[
                          ["Hypotheses", latestSynthesis.hypotheses],
                          ["Unanswered Questions", latestSynthesis.unansweredQuestions],
                          ["Missing Topics", latestSynthesis.missingTopics],
                          ["Emerging Trends", latestSynthesis.emergingTrends],
                          [
                            "Suggested Investigations",
                            latestSynthesis.suggestedInvestigations,
                          ],
                        ].some(([, items]) => (items as string[] | undefined)?.length) ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            {[
                              ["Hypotheses", latestSynthesis.hypotheses],
                              [
                                "Unanswered Questions",
                                latestSynthesis.unansweredQuestions,
                              ],
                              ["Missing Topics", latestSynthesis.missingTopics],
                              ["Emerging Trends", latestSynthesis.emergingTrends],
                              [
                                "Suggested Investigations",
                                latestSynthesis.suggestedInvestigations,
                              ],
                            ].map(([label, items]) =>
                              (items as string[] | undefined)?.length ? (
                                <div
                                  key={label as string}
                                  className="border border-slate-200 bg-white p-3"
                                >
                                  <h4 className="text-sm font-semibold">
                                    {label as string}
                                  </h4>
                                  <div className="mt-2 space-y-2">
                                    {(items as string[]).map((item) => (
                                      <p
                                        key={item}
                                        className="text-sm leading-5 text-slate-700"
                                      >
                                        {item}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ) : null,
                            )}
                          </div>
                        ) : null}
                        {(latestSynthesis.claimValidation ?? []).length ? (
                          <div>
                            <h4 className="text-sm font-semibold">
                              Claim Validation
                            </h4>
                            <div className="mt-2 space-y-2">
                              {(latestSynthesis.claimValidation ?? []).map((item) => (
                                <article
                                  key={`${item.claim}-${item.status}`}
                                  className="border border-slate-200 bg-white p-3"
                                >
                                  <div className="flex flex-wrap gap-2">
                                    <span className="border border-slate-300 bg-slate-50 px-2 py-1 text-xs capitalize">
                                      {item.status}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm font-semibold">
                                    {item.claim}
                                  </p>
                                  <p className="mt-1 text-sm leading-5 text-slate-700">
                                    {item.explanation}
                                  </p>
                                </article>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {(latestSynthesis.sourceReliability ?? []).length ? (
                          <div>
                            <h4 className="text-sm font-semibold">
                              Source Reliability
                            </h4>
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              {(latestSynthesis.sourceReliability ?? []).map((item) => (
                                <article
                                  key={item.source}
                                  className="border border-slate-200 bg-slate-50 p-3"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold">
                                      {item.source}
                                    </p>
                                    <span className="text-xs text-slate-500">
                                      {Math.round(item.score * 100)}%
                                    </span>
                                  </div>
                                  <p className="mt-2 text-xs leading-5 text-slate-600">
                                    {item.rationale}
                                  </p>
                                </article>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <EmptyState title="Generate a report from this collection." />
                    )}
                  </div>
                </section>

                <section className="border border-slate-300 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="font-semibold">Sources</h2>
                  </div>
                  <div className="max-h-[34rem] overflow-auto">
                    {activeCollection?.documents.map((document) => (
                      <article
                        key={document.id}
                        className="border-b border-slate-200 px-4 py-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => loadProject(document.projectId)}
                            className="min-w-0 text-left hover:text-sky-700"
                          >
                            <span className="block font-medium">
                              {document.projectTitle}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {document.fileName ?? "Document"} - {formatDate(document.addedAt)}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCollectionSource(document.id)}
                            disabled={busyAction === `collection-remove-${document.id}`}
                            className="shrink-0 border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
                          >
                            {busyAction === `collection-remove-${document.id}` ? "Removing" : "Remove"}
                          </button>
                        </div>
                      </article>
                    ))}
                    {!activeCollection?.documents.length ? (
                      <EmptyState title="Attach projects to compare sources." />
                    ) : null}
                  </div>
                </section>
              </div>
            </section>
          ) : null}

          {workspaceView === "knowledge" ? (
            <section className="space-y-4">
              <div className="border border-slate-300 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Knowledge Extraction
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      {activeCollection?.name ?? "Collection knowledge"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={runKnowledgeExtraction}
                    disabled={!activeCollection || busyAction === "collection-knowledge"}
                    className="inline-flex items-center justify-center gap-2 bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Network className="h-4 w-4" />
                    Extract knowledge
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <KnowledgeGraph
                  collection={activeCollection}
                  selectedEntityId={selectedEntity?.id ?? null}
                  onSelectEntity={setSelectedEntityId}
                />

                <section className="border border-slate-300 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="font-semibold">Entity Inspector</h2>
                  </div>
                  <div className="max-h-[32rem] space-y-4 overflow-auto p-4">
                    {selectedEntity ? (
                      <>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold">
                              {selectedEntity.name}
                            </h3>
                            <span className="border border-slate-300 bg-slate-50 px-2 py-1 text-xs">
                              {selectedEntity.type}
                            </span>
                            <span
                              className={clsx(
                                "border px-2 py-1 text-xs",
                                confidenceClass(selectedEntity.confidence),
                              )}
                            >
                              {selectedEntity.confidence}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-700">
                            {selectedEntity.summary}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold">
                            Related Documents
                          </h4>
                          <div className="mt-2 space-y-2">
                            {relatedDocuments.slice(0, 5).map((document) => (
                              <div
                                key={document.id}
                                className="border border-slate-200 bg-slate-50 p-3"
                              >
                                <p className="text-sm font-medium">
                                  {document.entityName}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  {document.context ?? "Mentioned in source document."}
                                </p>
                              </div>
                            ))}
                            {!relatedDocuments.length ? (
                              <EmptyState title="No document links found for this entity." />
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold">
                            Relationship Explorer
                          </h4>
                          <div className="mt-2 space-y-2">
                            {relatedRelationships.slice(0, 6).map((relationship) => (
                              <article
                                key={relationship.id}
                                className="border border-slate-200 bg-white p-3"
                              >
                                <p className="text-sm font-semibold">
                                  {relationship.sourceName} {relationship.relation}{" "}
                                  {relationship.targetName}
                                </p>
                                <div className="mt-2 h-2 bg-slate-100">
                                  <div
                                    className="h-2 bg-slate-950"
                                    style={{
                                      width: `${Math.max(
                                        8,
                                        Math.round(relationship.strength * 100),
                                      )}%`,
                                    }}
                                  />
                                </div>
                                {relationship.evidence ? (
                                  <p className="mt-2 text-xs leading-5 text-slate-600">
                                    {relationship.evidence}
                                  </p>
                                ) : null}
                              </article>
                            ))}
                            {!relatedRelationships.length ? (
                              <EmptyState title="No relationships selected." />
                            ) : null}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold">
                            Linked Insights
                          </h4>
                          <div className="mt-2 space-y-2">
                            {relatedInsights.slice(0, 4).map((insight) => (
                              <article
                                key={insight.id}
                                className="border border-slate-200 bg-slate-50 p-3"
                              >
                                <p className="text-sm font-semibold">
                                  {insight.title}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  {insight.body}
                                </p>
                              </article>
                            ))}
                            {!relatedInsights.length ? (
                              <EmptyState title="No linked insights found for this entity." />
                            ) : null}
                          </div>
                        </div>
                      </>
                    ) : (
                      <EmptyState title="Select an entity in the graph." />
                    )}
                  </div>
                </section>
              </div>

              <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                <section className="border border-slate-300 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="font-semibold">Entity Explorer</h2>
                  </div>
                  <div className="max-h-[38rem] overflow-auto p-3">
                    {activeCollection?.entities.map((entity) => (
                      <button
                        key={entity.id}
                        type="button"
                        onClick={() => setSelectedEntityId(entity.id)}
                        className={clsx(
                          "mb-2 block w-full border p-3 text-left",
                          selectedEntity?.id === entity.id
                            ? "border-slate-950 bg-white"
                            : "border-slate-200 bg-slate-50 hover:bg-white",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-semibold">{entity.name}</h3>
                          <span className="border border-slate-300 bg-white px-2 py-1 text-xs">
                            {entity.type}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-5 text-slate-700">
                          {entity.summary}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {entity.mentions} mentions
                        </p>
                      </button>
                    ))}
                    {!activeCollection?.entities.length ? (
                      <EmptyState title="No entities extracted yet." />
                    ) : null}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="border border-slate-300 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold">Connected Insights</h2>
                    </div>
                    <div className="grid gap-3 p-4 md:grid-cols-2">
                      {activeCollection?.insights.map((insight) => (
                        <article
                          key={insight.id}
                          className="border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex flex-wrap gap-2">
                            <span className="border border-slate-300 bg-white px-2 py-1 text-xs">
                              {insight.category}
                            </span>
                            <span className={clsx("border px-2 py-1 text-xs", confidenceClass(insight.confidence))}>
                              {insight.confidence}
                            </span>
                          </div>
                          <h3 className="mt-3 text-sm font-semibold">
                            {insight.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {insight.body}
                          </p>
                        </article>
                      ))}
                      {!activeCollection?.insights.length ? (
                        <EmptyState title="No linked insights yet." />
                      ) : null}
                    </div>
                  </div>

                  <div className="border border-slate-300 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold">Concept Links</h2>
                    </div>
                    <div className="space-y-3 p-4">
                      {activeCollection?.relationships.map((relationship) => (
                        <article
                          key={relationship.id}
                          className="border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-semibold">
                              {relationship.sourceName}
                            </span>
                            <span className="border border-slate-300 bg-white px-2 py-1 text-xs">
                              {relationship.relation}
                            </span>
                            <span className="font-semibold">
                              {relationship.targetName}
                            </span>
                          </div>
                          <div className="mt-3 h-2 bg-white">
                            <div
                              className="h-2 bg-slate-950"
                              style={{
                                width: `${Math.max(8, Math.round(relationship.strength * 100))}%`,
                              }}
                            />
                          </div>
                          {relationship.evidence ? (
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                              {relationship.evidence}
                            </p>
                          ) : null}
                        </article>
                      ))}
                      {!activeCollection?.relationships.length ? (
                        <EmptyState title="Entity relationships appear after knowledge extraction." />
                      ) : null}
                    </div>
                  </div>

                  <div className="border border-slate-300 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold">Research Claims</h2>
                    </div>
                    <div className="space-y-3 p-4">
                      {activeCollection?.claims.map((claim) => (
                        <article
                          key={claim.id}
                          className="border border-slate-200 bg-white p-3"
                        >
                          <div className="flex flex-wrap gap-2">
                            <span className="border border-slate-300 bg-slate-50 px-2 py-1 text-xs">
                              {claim.stance}
                            </span>
                            <span className={clsx("border px-2 py-1 text-xs", confidenceClass(claim.confidence))}>
                              {claim.confidence}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold">
                            {claim.claim}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {claim.evidence}
                          </p>
                        </article>
                      ))}
                      {!activeCollection?.claims.length ? (
                        <EmptyState title="No claims extracted yet." />
                      ) : null}
                    </div>
                  </div>
                </section>
              </div>
            </section>
          ) : null}

          {workspaceView === "chat" ? (
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="border border-slate-300 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <MessageSquareText className="h-4 w-4 text-sky-700" />
                    Research Chat
                  </h2>
                </div>
                <form
                  onSubmit={askCollectionQuestion}
                  className="flex gap-2 border-b border-slate-200 p-3"
                >
                  <input
                    value={collectionQuestion}
                    onChange={(event) => setCollectionQuestion(event.target.value)}
                    className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700"
                    placeholder="Ask across this collection"
                  />
                  <button
                    type="submit"
                    disabled={!activeCollection || busyAction === "collection-chat"}
                    className="inline-flex items-center justify-center bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
                    aria-label="Ask collection"
                  >
                    {busyAction === "collection-chat" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </form>
                <div className="max-h-[44rem] space-y-3 overflow-auto p-3">
                  {activeCollection?.qa.map((message) => (
                    <article
                      key={message.id}
                      className="border border-slate-200 bg-slate-50 p-3"
                    >
                      <h3 className="text-sm font-semibold">{message.question}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {message.answer}
                      </p>
                      {message.citations.length ? (
                        <div className="mt-3 space-y-1">
                          {message.citations.slice(0, 4).map((citation) => (
                            <button
                              key={`${message.id}-${citation.chunkId}-${citation.chunkIndex}`}
                              type="button"
                              onClick={() => openCitation(citation)}
                              className="block w-full border-l-2 border-sky-600 bg-white px-2 py-1 text-left text-xs leading-5 text-slate-600"
                            >
                              {citationTitle(citation)}: {citation.quote}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                  {!activeCollection?.qa.length ? (
                    <EmptyState title="Ask a question across the active collection." />
                  ) : null}
                </div>
              </div>

              <section className="border border-slate-300 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="font-semibold">Source References</h2>
                </div>
                <div className="max-h-[44rem] space-y-2 overflow-auto p-3">
                  {latestCollectionCitations.slice(0, 8).map((citation) => (
                    <button
                      key={`${citation.chunkId}-${citation.chunkIndex}-${citation.quote}`}
                      type="button"
                      onClick={() => openCitation(citation)}
                      className="block w-full border border-slate-200 bg-slate-50 p-3 text-left"
                    >
                      <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {citationTitle(citation)}
                      </span>
                      <span className="mt-2 block text-sm leading-5 text-slate-700">
                        {citation.quote}
                      </span>
                    </button>
                  ))}
                  {!latestCollectionCitations.length ? (
                    <EmptyState title="Citations appear after report or chat generation." />
                  ) : null}
                </div>
              </section>
            </section>
          ) : null}

          {workspaceView === "intelligence" ? (
            <section className="space-y-4">
              <div className="border border-slate-300 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Live Research Workspace Insights
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      Research Intelligence
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={saveInvestigationSession}
                    disabled={!activeCollection || busyAction === "save-session"}
                    className="inline-flex items-center justify-center gap-2 bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busyAction === "save-session" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <NotebookPen className="h-4 w-4" />
                    )}
                    Save session
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <MetricTile
                  label="Confidence"
                  value={`${confidencePercent(latestSynthesis)}%`}
                  tone="emerald"
                />
                <MetricTile
                  label="Evidence"
                  value={latestSynthesis.evidenceStrength ?? "moderate"}
                  tone="sky"
                />
                <MetricTile
                  label="Open Questions"
                  value={proactiveQuestions.length}
                  tone="amber"
                />
                <MetricTile
                  label="Saved Sessions"
                  value={activeCollection?.sessions.length ?? 0}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="space-y-4">
                  <div className="border border-slate-300 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold">Proactive Research Assistant</h2>
                    </div>
                    <div className="grid gap-3 p-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          Suggested Follow-Up Questions
                        </h3>
                        {proactiveQuestions.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setCollectionQuestion(item);
                              setWorkspaceView("chat");
                            }}
                            className="block w-full border border-slate-200 bg-slate-50 p-3 text-left text-sm leading-5 text-slate-700 hover:bg-white"
                          >
                            {item}
                          </button>
                        ))}
                        {!proactiveQuestions.length ? (
                          <EmptyState title="Generate a report or chat answer for suggested questions." />
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold">
                          Recommended Research Directions
                        </h3>
                        {proactiveSuggestions.map((item) => (
                          <p
                            key={item}
                            className="border border-slate-200 bg-white p-3 text-sm leading-5 text-slate-700"
                          >
                            {item}
                          </p>
                        ))}
                        {!proactiveSuggestions.length ? (
                          <EmptyState title="Extract knowledge to generate research directions." />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-300 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold">
                        Supporting vs Conflicting Evidence
                      </h2>
                    </div>
                    <div className="grid gap-3 p-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-emerald-800">
                          Supporting Signals
                        </h3>
                        {(latestSynthesis.claimValidation ?? [])
                          .filter((item) => item.status === "supported")
                          .slice(0, 5)
                          .map((item) => (
                            <article
                              key={item.claim}
                              className="border border-emerald-200 bg-emerald-50 p-3"
                            >
                              <p className="text-sm font-semibold">
                                {item.claim}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-emerald-900">
                                {item.explanation}
                              </p>
                            </article>
                          ))}
                        {!(latestSynthesis.claimValidation ?? []).some(
                          (item) => item.status === "supported",
                        ) ? (
                          <EmptyState title="Supported claim checks appear after a confidence or validation report." />
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-amber-800">
                          Contradiction Alerts
                        </h3>
                        {contradictionAlerts.map((alert) => (
                          <article
                            key={`${alert.title}-${alert.body}`}
                            className="border border-amber-200 bg-amber-50 p-3"
                          >
                            <p className="text-sm font-semibold">{alert.title}</p>
                            <p className="mt-1 text-xs leading-5 text-amber-900">
                              {alert.body}
                            </p>
                          </article>
                        ))}
                        {!contradictionAlerts.length ? (
                          <EmptyState title="No contradictions detected yet." />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-300 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold">Research Timeline</h2>
                    </div>
                    <div className="space-y-3 p-4">
                      {activityFeed.map((item) => (
                        <article
                          key={item.id}
                          className="border-l-2 border-slate-950 bg-slate-50 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="border border-slate-300 bg-white px-2 py-1 text-xs">
                              {item.label}
                            </span>
                            <span className="text-xs text-slate-500">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold">{item.title}</p>
                        </article>
                      ))}
                      {!activityFeed.length ? (
                        <EmptyState title="Collection activity appears as you run workflows." />
                      ) : null}
                    </div>
                  </div>
                </section>

                <aside className="space-y-4">
                  <section className="border border-slate-300 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold">Trending Concepts</h2>
                    </div>
                    <div className="space-y-2 p-3">
                      {trendingEntities.map((entity) => (
                        <button
                          key={entity.id}
                          type="button"
                          onClick={() => {
                            setSelectedEntityId(entity.id);
                            setWorkspaceView("knowledge");
                          }}
                          className="block w-full border border-slate-200 bg-slate-50 p-3 text-left hover:bg-white"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">{entity.name}</p>
                            <span className="text-xs text-slate-500">
                              {entity.mentions}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {entity.type}
                          </p>
                        </button>
                      ))}
                      {!trendingEntities.length ? (
                        <EmptyState title="Trending concepts appear after extraction." />
                      ) : null}
                    </div>
                  </section>

                  <section className="border border-slate-300 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold">
                        Recently Discovered Concepts
                      </h2>
                    </div>
                    <div className="space-y-2 p-3">
                      {recentlyDiscoveredConcepts.map((entity) => (
                        <div
                          key={entity.id}
                          className="border border-slate-200 bg-white p-3"
                        >
                          <p className="text-sm font-semibold">{entity.name}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {entity.summary}
                          </p>
                        </div>
                      ))}
                      {!recentlyDiscoveredConcepts.length ? (
                        <EmptyState title="No concepts discovered yet." />
                      ) : null}
                    </div>
                  </section>

                  <section className="border border-slate-300 bg-white">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold">Saved Research Sessions</h2>
                    </div>
                    <div className="space-y-2 p-3">
                      {activeCollection?.sessions.map((session) => (
                        <article
                          key={session.id}
                          className="border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold">
                              {session.title}
                            </h3>
                            <span className="border border-slate-300 bg-white px-2 py-1 text-xs">
                              {session.status}
                            </span>
                          </div>
                          {session.summary ? (
                            <p className="mt-2 text-xs leading-5 text-slate-600">
                              {session.summary}
                            </p>
                          ) : null}
                          {session.findings.length ? (
                            <p className="mt-2 text-xs text-slate-500">
                              {session.findings.length} linked findings
                            </p>
                          ) : null}
                        </article>
                      ))}
                      {!activeCollection?.sessions.length ? (
                        <EmptyState title="Save a session to preserve investigation memory." />
                      ) : null}
                    </div>
                  </section>
                </aside>
              </div>
            </section>
          ) : null}

          {workspaceView === "analytics" ? (
            <section className="space-y-4">
              <div className="border border-slate-300 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      AI Usage Analytics
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold">
                      Workflow Performance
                    </h2>
                  </div>
                  <LineChart className="h-5 w-5 text-slate-500" />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <MetricTile
                  label="Tokens"
                  value={compactNumber(analytics?.totalTokens ?? 0)}
                  tone="sky"
                />
                <MetricTile label="Runs" value={analytics?.totalRuns ?? 0} />
                <MetricTile
                  label="Avg Latency"
                  value={`${analytics?.averageLatencyMs ?? 0}ms`}
                  tone="emerald"
                />
                <MetricTile
                  label="Retrieval"
                  value={`${Math.round((analytics?.retrievalEfficiency ?? 0) * 100)}%`}
                  tone="amber"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="border border-slate-300 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="font-semibold">Provider Mix</h2>
                  </div>
                  <div className="space-y-3 p-4">
                    {(analytics?.providerBreakdown ?? []).map((provider) => (
                      <div
                        key={provider.provider}
                        className="border border-slate-200 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{provider.provider}</p>
                          <p className="text-xs text-slate-500">
                            {provider.runs} runs
                          </p>
                        </div>
                        <div className="mt-3 h-2 bg-white">
                          <div
                            className="h-2 bg-slate-950"
                            style={{
                              width: `${Math.min(100, Math.max(10, provider.runs * 16))}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {compactNumber(provider.tokens)} tokens - {provider.averageLatencyMs}ms avg
                        </p>
                      </div>
                    ))}
                    {!analytics?.providerBreakdown.length ? (
                      <EmptyState title="Run an AI workflow to populate analytics." />
                    ) : null}
                  </div>
                </section>

                <section className="border border-slate-300 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="font-semibold">Pipeline Runs</h2>
                  </div>
                  <div className="max-h-96 space-y-3 overflow-auto p-4">
                    {activeCollection?.pipelineRuns.map((run) => (
                      <article key={run.id} className="border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-semibold">{run.name}</h3>
                          <span className="border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                            {run.status}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {run.steps.map((step) => (
                            <div
                              key={step.id}
                              className="flex items-center gap-2 text-xs text-slate-600"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                              <span>{step.name}</span>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                    {!activeCollection?.pipelineRuns.length ? (
                      <EmptyState title="Pipeline activity appears after collection workflows." />
                    ) : null}
                  </div>
                </section>
              </div>
            </section>
          ) : null}
        </section>

        <aside className="space-y-4">
          {workspaceView === "project" ? (
            <>
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
                      onClick={() => void runSummary()}
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
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSummaryDepth("executive");
                        void runSummary("executive");
                      }}
                      disabled={!activeProject || busyAction === "summary"}
                      className="inline-flex items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <WandSparkles className="h-4 w-4" />
                      Executive brief
                    </button>
                    <button
                      type="button"
                      onClick={runInsights}
                      disabled={!activeProject || busyAction === "insights"}
                      className="inline-flex items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <GitCompareArrows className="h-4 w-4" />
                      Risks, gaps, contradictions
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
                      {!insights.keyFindings?.length ? (
                        <JsonPreview value={insights} />
                      ) : null}
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
                            <p className="text-sm font-semibold">
                              {keyword.keyword}
                            </p>
                            <span className="text-xs text-slate-500">
                              {Math.round(keyword.score * 100)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {keyword.rationale}
                          </p>
                        </div>
                      ))}
                      {!keywords.rankedKeywords?.length ? (
                        <JsonPreview value={keywords} />
                      ) : null}
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
                <form
                  onSubmit={askQuestion}
                  className="flex gap-2 border-b border-slate-200 p-3"
                >
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    className="min-w-0 flex-1 border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-700"
                    placeholder="Ask this document"
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
                <div className="max-h-96 space-y-3 overflow-auto p-3">
                  {activeProject?.qa.map((message) => (
                    <article
                      key={message.id}
                      className="border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold">
                          {message.question}
                        </h3>
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
                            <button
                              key={`${message.id}-${citation.chunkIndex}-${citation.quote}`}
                              type="button"
                              onClick={() => openCitation(citation)}
                              className="block w-full border-l-2 border-sky-600 bg-white px-2 py-1 text-left text-xs leading-5 text-slate-600"
                            >
                              Chunk {citation.chunkIndex}: {citation.quote}
                            </button>
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
            </>
          ) : (
            <>
              <section className="border border-slate-300 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <Sparkles className="h-4 w-4 text-emerald-700" />
                    Collection Actions
                  </h2>
                </div>
                <div className="space-y-2 p-3">
                  <button
                    type="button"
                    onClick={() => runCollectionReport("combined_summary")}
                    disabled={!activeCollection || busyAction === "collection-combined_summary"}
                    className="inline-flex w-full items-center justify-center gap-2 bg-slate-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <WandSparkles className="h-4 w-4" />
                    Generate Unified Report
                  </button>
                  <button
                    type="button"
                    onClick={() => runCollectionReport("source_comparison")}
                    disabled={!activeCollection || busyAction === "collection-source_comparison"}
                    className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <GitCompareArrows className="h-4 w-4" />
                    Compare Documents
                  </button>
                  {analystReportKinds.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => runCollectionReport(kind)}
                      disabled={!activeCollection || busyAction === `collection-${kind}`}
                      className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <WandSparkles className="h-4 w-4" />
                      {labelFromKind(kind)}
                    </button>
                  ))}
                  {reasoningReportKinds.map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => runCollectionReport(kind)}
                      disabled={!activeCollection || busyAction === `collection-${kind}`}
                      className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                      <Brain className="h-4 w-4" />
                      {labelFromKind(kind)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={runKnowledgeExtraction}
                    disabled={!activeCollection || busyAction === "collection-knowledge"}
                    className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <Network className="h-4 w-4" />
                    Extract Knowledge
                  </button>
                  <button
                    type="button"
                    onClick={saveInvestigationSession}
                    disabled={!activeCollection || busyAction === "save-session"}
                    className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <NotebookPen className="h-4 w-4" />
                    Save Session Memory
                  </button>
                  <button
                    type="button"
                    onClick={() => exportReport("markdown")}
                    disabled={!activeCollection || busyAction === "export-markdown"}
                    className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Markdown Export
                  </button>
                  <button
                    type="button"
                    onClick={() => exportReport("json")}
                    disabled={!activeCollection || busyAction === "export-json"}
                    className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    JSON Export
                  </button>
                </div>
              </section>

              <section className="border border-slate-300 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <NotebookPen className="h-4 w-4 text-emerald-700" />
                    Collection Notes
                  </h2>
                </div>
                <div className="space-y-3 p-3">
                  <textarea
                    value={collectionNoteDraft}
                    onChange={(event) => setCollectionNoteDraft(event.target.value)}
                    className="min-h-24 w-full border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700"
                    placeholder="Capture a cross-document note"
                  />
                  <button
                    type="button"
                    onClick={saveCollectionNote}
                    disabled={
                      !activeCollection ||
                      !collectionNoteDraft.trim() ||
                      busyAction === "collection-note"
                    }
                    className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    <NotebookPen className="h-4 w-4" />
                    Save collection note
                  </button>
                  <div className="space-y-2">
                    {activeCollection?.notes.slice(0, 5).map((note) => (
                      <article
                        key={note.id}
                        className="border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-sm font-semibold">{note.title}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-700">
                          {note.body}
                        </p>
                      </article>
                    ))}
                    {!activeCollection?.notes.length ? (
                      <EmptyState title="Save notes for this collection." />
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="border border-slate-300 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="font-semibold">Pinned Insights</h2>
                </div>
                <div className="max-h-96 space-y-3 overflow-auto p-3">
                  {activeCollection?.insights.slice(0, 5).map((insight) => (
                    <article
                      key={insight.id}
                      className="border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <p className="mt-1 text-sm leading-5 text-slate-700">
                        {insight.body}
                      </p>
                    </article>
                  ))}
                  {!activeCollection?.insights.length ? (
                    <EmptyState title="Extract knowledge to populate insights." />
                  ) : null}
                </div>
              </section>
            </>
          )}
        </aside>
      </div>

      {commandOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30 p-4">
          <div className="mx-auto mt-16 max-w-2xl border border-slate-300 bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-200 p-3">
              <Command className="h-4 w-4 text-slate-500" />
              <input
                autoFocus
                className="min-w-0 flex-1 outline-none"
                placeholder="Run command"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setCommandOpen(false)}
                className="p-1 text-slate-500"
                aria-label="Close command palette"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setWorkspaceView("collections");
                  setCommandOpen(false);
                }}
                className="flex items-center gap-3 border border-slate-200 p-3 text-left text-sm hover:bg-slate-50"
              >
                <Layers3 className="h-4 w-4" />
                Open collections
              </button>
              <button
                type="button"
                onClick={() => {
                  void runCollectionReport("executive_brief");
                  setCommandOpen(false);
                }}
                disabled={!activeCollection}
                className="flex items-center gap-3 border border-slate-200 p-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <WandSparkles className="h-4 w-4" />
                Generate executive brief
              </button>
              <button
                type="button"
                onClick={() => {
                  void runKnowledgeExtraction();
                  setCommandOpen(false);
                }}
                disabled={!activeCollection}
                className="flex items-center gap-3 border border-slate-200 p-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <Network className="h-4 w-4" />
                Extract knowledge
              </button>
              <button
                type="button"
                onClick={() => {
                  void runCollectionReport("confidence_report");
                  setCommandOpen(false);
                }}
                disabled={!activeCollection}
                className="flex items-center gap-3 border border-slate-200 p-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <Brain className="h-4 w-4" />
                Generate confidence report
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkspaceView("intelligence");
                  setCommandOpen(false);
                }}
                className="flex items-center gap-3 border border-slate-200 p-3 text-left text-sm hover:bg-slate-50"
              >
                <Activity className="h-4 w-4" />
                Open intelligence
              </button>
              <button
                type="button"
                onClick={() => {
                  setWorkspaceView("analytics");
                  setCommandOpen(false);
                }}
                className="flex items-center gap-3 border border-slate-200 p-3 text-left text-sm hover:bg-slate-50"
              >
                <Activity className="h-4 w-4" />
                Open analytics
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
