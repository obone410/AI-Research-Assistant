import { NextRequest } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import { synthesisReportKindSchema } from "@/lib/ai/schemas";
import { getResearchContext } from "@/lib/research/repository";
import { synthesizeCollection } from "@/lib/research/processing";

export const runtime = "nodejs";

const requestSchema = z.object({
  kind: synthesisReportKindSchema.default("combined_summary"),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await enforceRateLimit(request, "collections:synthesize", 12);
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

    const { id } = await context.params;
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to synthesize collections.", 401);
    }

    return ok(await synthesizeCollection(ctx, id, parsed.data.kind));
  } catch (error) {
    return unknownFail(error);
  }
}
