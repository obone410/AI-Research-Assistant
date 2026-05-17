import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { getResearchContext, togglePin } from "@/lib/research/repository";

export const runtime = "nodejs";

const requestSchema = z.object({
  messageId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await enforceRateLimit(request, "qa:pin", 60);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Pin rate limit exceeded.", 429, {
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
      return fail("unauthorized", "Sign in to pin answers.", 401);
    }

    const { id } = await context.params;
    const message = await togglePin(ctx, id, parsed.data.messageId);
    if (!message) {
      return fail("not_found", "Answer not found.", 404);
    }

    return ok({ message });
  } catch (error) {
    return unknownFail(error);
  }
}
