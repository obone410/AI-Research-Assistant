import { NextRequest } from "next/server";
import { fail, ok, unknownFail } from "@/lib/api/response";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEEPALIVE_ID = "researchos-supabase-keepalive";

function isAuthorizedCronRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret) {
    return authorization === `Bearer ${cronSecret}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const schedule = request.headers.get("x-vercel-cron-schedule");

  return userAgent.includes("vercel-cron/1.0") && Boolean(schedule);
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return fail(
      "unauthorized",
      "Keepalive route requires a valid Vercel cron request.",
      401,
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const touchedAt = new Date().toISOString();
    const source = request.headers.get("user-agent")?.slice(0, 160) ?? null;
    const schedule = request.headers.get("x-vercel-cron-schedule");

    const { error } = await supabase.from("system_keepalives").upsert(
      {
        id: KEEPALIVE_ID,
        touched_at: touchedAt,
        source,
        schedule,
        deployment:
          process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
          process.env.VERCEL_URL ??
          null,
        metadata: {
          vercelEnv: process.env.VERCEL_ENV ?? null,
          targetEnv: process.env.VERCEL_TARGET_ENV ?? null,
        },
      },
      { onConflict: "id" },
    );

    if (!error) {
      return ok({
        status: "ok",
        mode: "upsert",
        touchedAt,
      });
    }

    const tableMissing =
      error.code === "42P01" ||
      error.message.toLowerCase().includes("system_keepalives");

    if (!tableMissing) {
      throw new Error(error.message);
    }

    const fallback = await supabase
      .from("research_projects")
      .select("id", { count: "exact", head: true });

    if (fallback.error) {
      throw new Error(fallback.error.message);
    }

    return ok({
      status: "ok",
      mode: "fallback_read",
      touchedAt,
      migrationRequired: "supabase/migrations/0008_system_keepalive.sql",
    });
  } catch (error) {
    return unknownFail(error);
  }
}
