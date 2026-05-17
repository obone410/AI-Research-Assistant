import { NextRequest } from "next/server";
import { fail, ok, unknownFail } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import {
  getProjectDetail,
  getResearchContext,
} from "@/lib/research/repository";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await enforceRateLimit(request, "projects:detail", 90);
  if (!limit.allowed) {
    return fail(
      "rate_limit_exceeded",
      "Too many requests.",
      429,
      { retryAfter: limit.retryAfter },
    );
  }

  try {
    const { id } = await context.params;
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to view this project.", 401);
    }

    const project = await getProjectDetail(ctx, id);
    if (!project) {
      return fail("not_found", "Project not found.", 404);
    }

    return ok({ project, mode: ctx.mode });
  } catch (error) {
    return unknownFail(error);
  }
}
