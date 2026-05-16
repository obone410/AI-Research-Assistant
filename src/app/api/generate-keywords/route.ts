import { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import { getResearchContext } from "@/lib/research/repository";
import { generateKeywords } from "@/lib/research/processing";

export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "ai:keywords", 16);
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
      return fail("unauthorized", "Sign in to generate keywords.", 401);
    }

    return ok(await generateKeywords(ctx, parsed.data.projectId));
  } catch (error) {
    return unknownFail(error);
  }
}
