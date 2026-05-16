"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "@/lib/public-config";

export function createSupabaseBrowserClient() {
  if (!publicConfig.supabaseUrl || !publicConfig.supabaseAnonKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return createBrowserClient(
    publicConfig.supabaseUrl,
    publicConfig.supabaseAnonKey,
  );
}
