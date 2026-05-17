import { NextRequest } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import {
  getCollectionDetail,
  getProjectDetail,
  getResearchContext,
  recordAction,
  saveExportRecord,
} from "@/lib/research/repository";
import {
  buildCollectionJsonReport,
  buildCollectionMarkdownReport,
  buildJsonReport,
  buildMarkdownReport,
} from "@/lib/research/export";

export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().min(1).optional(),
  collectionId: z.string().min(1).optional(),
  format: z.enum(["markdown", "json"]).default("markdown"),
}).refine((value) => Boolean(value.projectId || value.collectionId), {
  message: "Provide projectId or collectionId.",
  path: ["projectId"],
});

export async function POST(request: NextRequest) {
  const limit = await enforceRateLimit(request, "exports:create", 30);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Export rate limit exceeded.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationFail(parsed.error);
    }

    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to export reports.", 401);
    }

    if (parsed.data.collectionId) {
      const collection = await getCollectionDetail(ctx, parsed.data.collectionId);
      if (!collection) {
        return fail("not_found", "Collection not found.", 404);
      }

      const payload =
        parsed.data.format === "json"
          ? buildCollectionJsonReport(collection)
          : buildCollectionMarkdownReport(collection);
      await recordAction(ctx, {
        action: "report.export",
        targetType: "collection",
        targetId: collection.id,
        metadata: {
          format: parsed.data.format,
          payloadBytes: payload.length,
        },
      });

      return ok({
        fileName: `${collection.name.replace(/[^\w\-]+/g, "-").toLowerCase()}.${parsed.data.format === "json" ? "json" : "md"}`,
        format: parsed.data.format,
        payload,
      });
    }

    const project = await getProjectDetail(ctx, parsed.data.projectId as string);
    if (!project) {
      return fail("not_found", "Project not found.", 404);
    }
    const payload =
      parsed.data.format === "json"
        ? buildJsonReport(project)
        : buildMarkdownReport(project);

    await saveExportRecord(ctx, project.id, parsed.data.format, payload);

    return ok({
      fileName: `${project.title.replace(/[^\w\-]+/g, "-").toLowerCase()}.${parsed.data.format === "json" ? "json" : "md"}`,
      format: parsed.data.format,
      payload,
    });
  } catch (error) {
    return unknownFail(error);
  }
}
