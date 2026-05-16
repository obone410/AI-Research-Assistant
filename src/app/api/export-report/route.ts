import { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import {
  getProjectDetail,
  getResearchContext,
  saveExportRecord,
} from "@/lib/research/repository";
import { buildJsonReport, buildMarkdownReport } from "@/lib/research/export";

export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().min(1),
  format: z.enum(["markdown", "json"]).default("markdown"),
});

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "exports:create", 30);
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

    const project = await getProjectDetail(ctx, parsed.data.projectId);
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
