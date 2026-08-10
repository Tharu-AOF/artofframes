import { createBrowserClient } from "@supabase/ssr";

// Browser client — safe to use in client components. Reads the
// public anon key from the environment. Throws a clear error if
// Supabase isn't configured yet so misconfiguration is obvious.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }
  return createBrowserClient(url, anonKey);
}
