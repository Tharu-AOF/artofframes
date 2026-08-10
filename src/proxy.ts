import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ============================================================
// PROXY (Next 16 — the renamed middleware) — guards the admin
// panel. The old middleware.ts called supabase.auth.getUser()
// on EVERY /admin request, adding a Supabase round trip
// (~200-400ms) to every navigation. The session cookie is now
// inspected locally first:
//
//   - No cookie        → redirect/allow instantly (no network)
//   - Fresh JWT        → redirect/allow instantly (no network)
//   - Expired/mangled  → getUser() validates + refreshes as before
//
// Tradeoff: a token that is locally unexpired but was revoked
// server-side won't be caught until it expires (or a write 401s).
// ============================================================

const AUTH_COOKIE_PREFIX = "sb-";
const AUTH_COOKIE_SUFFIX = "-auth-token";
// Tokens expiring within 60s are treated as expired so a refresh
// never races the redirect.
const EXPIRY_BUFFER_S = 60;

function jwtExpiry(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(
      Buffer.from(b64, "base64").toString("utf8")
    ) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

// true  = session cookie exists AND its access token is still valid.
// false = no session cookie at all.
// null  = cookie exists but can't be verified locally (expired or
//         mangled) — the caller must hit Supabase.
function sessionState(request: NextRequest): boolean | null {
  const cookie = request.cookies
    .getAll()
    .find(
      (c) =>
        c.name.startsWith(AUTH_COOKIE_PREFIX) &&
        c.name.endsWith(AUTH_COOKIE_SUFFIX)
    );
  if (!cookie) return false;
  const raw = cookie.value.startsWith("base64-")
    ? cookie.value.slice("base64-".length)
    : cookie.value;
  let session: { access_token?: unknown };
  try {
    session = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof session?.access_token !== "string") return null;
  const exp = jwtExpiry(session.access_token);
  if (exp === null) return null;
  return exp > Math.floor(Date.now() / 1000) + EXPIRY_BUFFER_S;
}

const redirectTo = (request: NextRequest, pathname: string) => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
};

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname.startsWith("/admin/login");
  const state = sessionState(request);

  // Fastest paths — no Supabase call at all.
  if (state === false) {
    return isLogin
      ? NextResponse.next({ request })
      : redirectTo(request, "/admin/login");
  }
  if (state === true) {
    return isLogin
      ? redirectTo(request, "/admin")
      : NextResponse.next({ request });
  }

  // state === null: validate + (if needed) refresh via Supabase.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and
  // supabase.auth.getUser() — the token refresh happens there.
  // Bound the wait: a slow/unreachable Supabase must never hang an
  // admin navigation — after 8s treat the visitor as logged out.
  const USER_TIMEOUT_MS = 8000;
  const {
    data: { user },
  } = await Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(
        () => resolve({ data: { user: null } }),
        USER_TIMEOUT_MS
      )
    ),
  ]);

  if (!isLogin && !user) return redirectTo(request, "/admin/login");
  if (isLogin && user) return redirectTo(request, "/admin");

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*"],
};
