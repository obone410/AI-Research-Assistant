import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { isSupabaseConfigured, serverConfig } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

export function rateLimit(
  request: NextRequest,
  action: string,
  limit = 24,
  windowMs = 60_000,
) {
  const key = `${action}:${getClientIp(request)}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfter: 0,
  };
}

export async function enforceRateLimit(
  request: NextRequest,
  action: string,
  limit = 24,
  windowMs = 60_000,
) {
  const local = rateLimit(request, action, limit, windowMs);
  if (!local.allowed) {
    return local;
  }

  if (!isSupabaseConfigured() || !serverConfig.supabaseServiceRoleKey) {
    return local;
  }

  try {
    const identifierHash = createHash("sha256")
      .update(getClientIp(request))
      .digest("hex");
    const key = createHash("sha256")
      .update(`${action}:${identifierHash}:${Math.floor(Date.now() / windowMs)}`)
      .digest("hex");

    const { data, error } = await createSupabaseAdminClient().rpc(
      "check_rate_limit",
      {
        p_key: key,
        p_action: action,
        p_identifier_hash: identifierHash,
        p_limit: limit,
        p_window_seconds: Math.ceil(windowMs / 1000),
      },
    );

    if (error || !data?.[0]) {
      console.warn("Persistent rate limit unavailable:", error?.message);
      return local;
    }

    return {
      allowed: Boolean(data[0].allowed),
      remaining: Number(data[0].remaining ?? local.remaining),
      retryAfter: Number(data[0].retry_after ?? 0),
    };
  } catch (error) {
    console.warn(
      "Persistent rate limit fallback:",
      error instanceof Error ? error.message : String(error),
    );
    return local;
  }
}
