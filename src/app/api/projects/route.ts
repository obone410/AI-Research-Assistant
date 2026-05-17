import { NextRequest } from "next/server";
import { fail, ok, unknownFail } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { getResearchContext, listProjects } from "@/lib/research/repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limit = await enforceRateLimit(request, "projects:list", 90);
  if (!limit.allowed) {
    return fail(
      "rate_limit_exceeded",
      "Too many requests.",
      429,
      { retryAfter: limit.retryAfter },
    );
  }

  try {
    const ctx = await getResearchContext();
    if (!ctx) {
      return fail("unauthorized", "Sign in to view research projects.", 401);
    }

    return ok({ projects: await listProjects(ctx), mode: ctx.mode });
  } catch (error) {
    return unknownFail(error);
  }
}
