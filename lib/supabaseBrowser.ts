import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

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
  return client;
}
