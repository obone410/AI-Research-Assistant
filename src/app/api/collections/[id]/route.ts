import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail } from "@/lib/api/response";
import {
  getCollectionDetail,
  getResearchContext,
} from "@/lib/research/repository";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = rateLimit(request, "collections:detail", 90);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Too many requests.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  try {
    const { id } = await context.params;
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to view this collection.", 401);
    }

    const collection = await getCollectionDetail(ctx, id);
    if (!collection) {
      return fail("not_found", "Collection not found.", 404);
    }

    return ok({ collection, mode: ctx.mode });
  } catch (error) {
    return unknownFail(error);
  }
}
