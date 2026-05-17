import { NextRequest } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import { getResearchContext } from "@/lib/research/repository";
import { extractInsights } from "@/lib/research/processing";

export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const limit = await enforceRateLimit(request, "ai:insights", 16);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "AI rate limit exceeded.", 429, {
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
      return fail("unauthorized", "Sign in to extract insights.", 401);
    }

    return ok(await extractInsights(ctx, parsed.data.projectId));
  } catch (error) {
    return unknownFail(error);
  }
}
