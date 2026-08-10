import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// POST /api/admin/upload — uploads an image to the public
// "product-images" bucket. Requires a logged-in admin session.
// Uploads with the service role (server-side only) because
// storage.objects RLS can't be configured programmatically, so
// a plain client upload would be denied.
// ============================================================

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

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

  // 2. Validate the file.
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPEG, WebP and GIF images are allowed" },
      { status: 400 }
    );
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 15 MB" }, { status: 400 });
  }

  // 3. Upload with the service role (bypasses storage RLS).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 500 }
    );
  }
  const serviceClient = createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `products/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await serviceClient.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = serviceClient.storage
    .from("product-images")
    .getPublicUrl(path);
  return NextResponse.json({ url: publicData.publicUrl });
}
