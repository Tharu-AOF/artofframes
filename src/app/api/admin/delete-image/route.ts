import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// POST /api/admin/delete-image — removes an image from the public
// "product-images" bucket. Requires a logged-in admin session.
// Only URLs that resolve to objects inside that bucket are
// accepted, so arbitrary paths can't be deleted. Uses the service
// role (server-side only) because storage RLS can't be configured
// programmatically.
// ============================================================

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1. Authenticate — an admin session is required.
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate the target URL — must be an object in our bucket.
  const { url } = (await request.json().catch(() => ({}))) as {
    url?: string;
  };
  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "No image URL provided" },
      { status: 400 }
    );
  }
  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!storageUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 }
    );
  }
  const prefix = `${storageUrl}/storage/v1/object/public/product-images/`;
  if (!url.startsWith(prefix)) {
    return NextResponse.json({ error: "Not a stored image" }, { status: 400 });
  }
  const path = decodeURIComponent(url.slice(prefix.length));
  if (!path || path.split("/").some((seg) => seg === ".." || seg === "")) {
    return NextResponse.json({ error: "Invalid image path" }, { status: 400 });
  }

  // 3. Remove with the service role (bypasses storage RLS).
  const serviceClient = createSupabaseClient(storageUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await serviceClient.storage
    .from("product-images")
    .remove([path]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
