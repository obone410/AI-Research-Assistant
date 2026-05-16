import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import { rateLimit } from "@/lib/api/rate-limit";
import { addNote, getResearchContext } from "@/lib/research/repository";

export const runtime = "nodejs";

const requestSchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().min(1).max(4000),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = rateLimit(request, "notes:create", 40);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Note rate limit exceeded.", 429, {
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
      return fail("unauthorized", "Sign in to save notes.", 401);
    }

    const { id } = await context.params;
    return ok({
      note: await addNote(ctx, id, parsed.data.body, parsed.data.title),
    });
  } catch (error) {
    return unknownFail(error);
  }
}
