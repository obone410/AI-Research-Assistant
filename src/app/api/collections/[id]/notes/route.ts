import { NextRequest } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import {
  addCollectionNote,
  getResearchContext,
} from "@/lib/research/repository";

export const runtime = "nodejs";

const requestSchema = z.object({
  title: z.string().max(120).optional(),
  body: z.string().min(2).max(5000),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await enforceRateLimit(request, "collection-notes:create", 40);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Too many requests.", 429, {
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
      return fail("unauthorized", "Sign in to save collection notes.", 401);
    }

    const note = await addCollectionNote(
      ctx,
      id,
      parsed.data.body,
      parsed.data.title,
    );

    return ok({ note }, { status: 201 });
  } catch (error) {
    return unknownFail(error);
  }
}
