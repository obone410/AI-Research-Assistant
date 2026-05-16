import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { addHighlight, getResearchContext } from "@/lib/research/repository";

export const runtime = "nodejs";

const requestSchema = z.object({
  quote: z.string().min(1).max(3000),
  chunkId: z.string().optional(),
  note: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = rateLimit(request, "highlights:create", 40);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Highlight rate limit exceeded.", 429, {
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
      return fail("unauthorized", "Sign in to save highlights.", 401);
    }

    const { id } = await context.params;
    return ok({
      highlight: await addHighlight(
        ctx,
        id,
        parsed.data.quote,
        parsed.data.chunkId,
        parsed.data.note,
      ),
    });
  } catch (error) {
    return unknownFail(error);
  }
}
