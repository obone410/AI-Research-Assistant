import { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import {
  createResearchCollection,
  getResearchContext,
  listCollections,
} from "@/lib/research/repository";

export const runtime = "nodejs";

const createCollectionSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "collections:list", 90);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Too many requests.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  try {
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to view research collections.", 401);
    }

    return ok({ collections: await listCollections(ctx), mode: ctx.mode });
  } catch (error) {
    return unknownFail(error);
  }
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "collections:create", 24);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Too many requests.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  try {
    const parsed = createCollectionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationFail(parsed.error);
    }

    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to create collections.", 401);
    }

    const collection = await createResearchCollection(
      ctx,
      parsed.data.name,
      parsed.data.description,
    );

    return ok({ collection }, { status: 201 });
  } catch (error) {
    return unknownFail(error);
  }
}
