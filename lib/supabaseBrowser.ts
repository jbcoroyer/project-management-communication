import { createBrowserClient } from "@supabase/ssr";
import {
  clearInvalidSupabaseSession,
  isInvalidRefreshTokenError,
} from "./supabaseAuthRecovery";

let client: ReturnType<typeof createBrowserClient> | null = null;
let recoveryScheduled = false;

function scheduleStaleSessionCleanup(
  supabase: NonNullable<typeof client>,
) {
  if (typeof window === "undefined" || recoveryScheduled) return;
  recoveryScheduled = true;
  void (async () => {
    const { error } = await supabase.auth.getSession();
    if (error && isInvalidRefreshTokenError(error)) {
      await clearInvalidSupabaseSession(supabase);
    }
  })();
}

function requireEnv(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable "${name}". Configure it in your Next.js environment (NEXT_PUBLIC_...).`,
    );
  }
  return value;
}

export function getSupabaseBrowser() {
  if (client) return client;
  client = createBrowserClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
      },
    },
  );
  scheduleStaleSessionCleanup(client);
  return client;
}
