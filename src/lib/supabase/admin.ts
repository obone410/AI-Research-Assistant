import { createClient } from "@supabase/supabase-js";
import { publicConfig, serverConfig } from "@/lib/config";

export function createSupabaseAdminClient() {
  if (!publicConfig.supabaseUrl || !serverConfig.supabaseServiceRoleKey) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createClient(
    publicConfig.supabaseUrl,
    serverConfig.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
