import { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/api/rate-limit";
import { fail, ok, unknownFail, validationFail } from "@/lib/api/response";
import {
  attachProjectToCollection,
  getResearchContext,
} from "@/lib/research/repository";

export const runtime = "nodejs";

const requestSchema = z.object({
  projectId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const limit = rateLimit(request, "collections:attach", 40);
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
      return fail("unauthorized", "Sign in to add documents.", 401);
    }

    const document = await attachProjectToCollection(
      ctx,
      id,
      parsed.data.projectId,
    );

    if (!document) {
      return fail("not_found", "Project or collection not found.", 404);
    }

    return ok({ document }, { status: 201 });
  } catch (error) {
    return unknownFail(error);
  }
}
