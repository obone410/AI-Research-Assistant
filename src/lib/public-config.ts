export const publicConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export function isPublicSupabaseConfigured() {
  return Boolean(publicConfig.supabaseUrl && publicConfig.supabaseAnonKey);
}
