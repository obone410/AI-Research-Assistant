import { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import {
  getCollectionDetail,
  getResearchContext,
} from "@/lib/research/repository";

export const runtime = "nodejs";

const querySchema = z.object({
  collectionId: z.string().min(1),
  q: z.string().max(120).optional(),
});

export async function GET(request: NextRequest) {
  const limit = rateLimit(request, "entities:list", 60);
  if (!limit.allowed) {
    return fail("rate_limit_exceeded", "Too many requests.", 429, {
      retryAfter: limit.retryAfter,
    });
  }

  try {
    const parsed = querySchema.safeParse({
      collectionId: request.nextUrl.searchParams.get("collectionId"),
      q: request.nextUrl.searchParams.get("q") ?? undefined,
    });
    if (!parsed.success) {
      return validationFail(parsed.error);
    }

    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to view entities.", 401);
    }

    const collection = await getCollectionDetail(ctx, parsed.data.collectionId);
    if (!collection) {
      return fail("not_found", "Collection not found.", 404);
    }

    const query = parsed.data.q?.toLowerCase().trim();
    const entities = query
      ? collection.entities.filter(
          (entity) =>
            entity.name.toLowerCase().includes(query) ||
            entity.type.toLowerCase().includes(query) ||
            entity.summary.toLowerCase().includes(query),
        )
      : collection.entities;

    return ok({
      entities,
      documentEntities: collection.documentEntities,
      relationships: collection.relationships,
    });
  } catch (error) {
    return unknownFail(error);
  }
}
