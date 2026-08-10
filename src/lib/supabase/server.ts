import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server client — used in Server Components / Server Actions / API
// routes. Session cookies flow through automatically.
//
// Outside a request scope (scripts, tests) `cookies()` throws — we
// fall back to a plain public-read client, which is all the shop / kb
// reads need (they run under public RLS policies). Inside a request
// the cookie-aware client is always used, so runtime behavior is
// unchanged.
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local"
    );
  }

  // Outside a request scope (chat tests / scripts) `cookies()` throws —
  // fall back to a plain public-read client, which is all the shop / kb
  // reads need (public RLS). Only this call is guarded so a genuine
  // client error (bad URL/key) still surfaces instead of being swallowed.
  let cookieStore: Awaited<ReturnType<typeof cookies>>;
  try {
    cookieStore = await cookies();
  } catch {
    return createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore when
          // middleware refreshes sessions.
        }
      },
    },
  });
}
