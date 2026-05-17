import { publicConfig } from "@/lib/public-config";

export { publicConfig };

export const serverConfig = {
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiChatModel: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
  openAiEmbeddingModel:
    process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  aiProvider:
    process.env.AI_PROVIDER === "anthropic" ? "anthropic" : "openai",
  demoMode: process.env.DEMO_MODE === "true",
};

export function isSupabaseConfigured() {
  return Boolean(publicConfig.supabaseUrl && publicConfig.supabaseAnonKey);
}

export function hasConfiguredAiProvider() {
  if (serverConfig.demoMode) {
    return false;
  }

  if (serverConfig.aiProvider === "anthropic") {
    return Boolean(serverConfig.anthropicApiKey);
  }

  return Boolean(serverConfig.openAiApiKey);
}

export function shouldUseDemoAi() {
  return serverConfig.demoMode || !hasConfiguredAiProvider();
}
