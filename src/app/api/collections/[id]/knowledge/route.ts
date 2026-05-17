import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail } from "@/lib/api/response";
import { getResearchContext } from "@/lib/research/repository";
import { extractCollectionKnowledge } from "@/lib/research/processing";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await enforceRateLimit(request, "collections:knowledge", 16);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "AI rate limit exceeded.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  try {
    const { id } = await context.params;
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to extract knowledge.", 401);
    }

    return ok(await extractCollectionKnowledge(ctx, id));
  } catch (error) {
    return unknownFail(error);
  }
}
