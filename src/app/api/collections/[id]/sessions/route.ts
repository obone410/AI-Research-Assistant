import { NextRequest } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import { citationSchema } from "@/lib/ai/schemas";
import {
  createResearchSession,
  getCollectionDetail,
  getResearchContext,
} from "@/lib/research/repository";

export const runtime = "nodejs";

const requestSchema = z.object({
  title: z.string().min(3).max(120),
  summary: z.string().max(1200).optional(),
  memory: z.record(z.string(), z.unknown()).optional(),
  findings: z
    .array(
      z.object({
        findingType: z.string().min(2).max(60),
        title: z.string().min(3).max(140),
        body: z.string().min(3).max(1600),
        citations: z.array(citationSchema).optional(),
        confidence: z.enum(["low", "medium", "high"]).optional(),
      }),
    )
    .max(8)
    .optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await enforceRateLimit(request, "collections:sessions:list", 120);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Session rate limit exceeded.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  try {
    const { id } = await context.params;
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to view research sessions.", 401);
    }

    const collection = await getCollectionDetail(ctx, id);
    return ok({ sessions: collection?.sessions ?? [] });
  } catch (error) {
    return unknownFail(error);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = await enforceRateLimit(request, "collections:sessions:create", 24);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Session rate limit exceeded.", 429, {
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
      return fail("unauthorized", "Sign in to save research sessions.", 401);
    }

    return ok(
      await createResearchSession(ctx, {
        collectionId: id,
        ...parsed.data,
      }),
    );
  } catch (error) {
    return unknownFail(error);
  }
}
