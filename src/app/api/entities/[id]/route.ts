import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail } from "@/lib/api/response";
import {
  getEntityDetail,
  getResearchContext,
} from "@/lib/research/repository";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await enforceRateLimit(request, "entities:detail", 60);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Too many requests.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  try {
    const { id } = await context.params;
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to view this entity.", 401);
    }

    const entity = await getEntityDetail(ctx, id);
    if (!entity) {
      return fail("not_found", "Entity not found.", 404);
    }

    return ok({ entity, mode: ctx.mode });
  } catch (error) {
    return unknownFail(error);
  }
}
