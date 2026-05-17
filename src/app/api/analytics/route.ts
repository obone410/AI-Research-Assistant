import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail } from "@/lib/api/response";
import { getResearchContext, getUsageAnalytics } from "@/lib/research/repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limit = await enforceRateLimit(request, "analytics:usage", 60);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Too many requests.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  try {
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to view analytics.", 401);
    }

    return ok({ analytics: await getUsageAnalytics(ctx), mode: ctx.mode });
  } catch (error) {
    return unknownFail(error);
  }
}
