import { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import { getResearchContext } from "@/lib/research/repository";
import { answerCollectionQuestion } from "@/lib/research/processing";

export const runtime = "nodejs";

const requestSchema = z.object({
  question: z.string().min(3).max(1400),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = rateLimit(request, "collections:chat", 24);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Chat rate limit exceeded.", 429, {
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
      return fail("unauthorized", "Sign in to chat with collections.", 401);
    }

    return ok(await answerCollectionQuestion(ctx, id, parsed.data.question));
  } catch (error) {
    return unknownFail(error);
  }
}
