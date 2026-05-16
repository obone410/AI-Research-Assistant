import { AuthGate } from "@/components/auth-gate";
import { ResearchWorkspace } from "@/components/research-workspace";
import { isSupabaseConfigured, shouldUseDemoAi } from "@/lib/config";

export default function Home() {
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <AuthGate supabaseConfigured={supabaseConfigured}>
      <ResearchWorkspace
        supabaseConfigured={supabaseConfigured}
        demoAi={shouldUseDemoAi()}
      />
    </AuthGate>
  );
}
