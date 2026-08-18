import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

// Disable sharp file caching
sharp.cache(false);

// Load .env.local manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        process.env[key] = value;
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "product-images";
const MAX_DIMENSION = 1600;
const QUALITY = 82;

let totalInitialBytes = 0;
let totalFinalBytes = 0;
let optimizedCount = 0;

async function listAllFiles(folder = "") {
  const allFiles = [];
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });

  if (error) {
    console.error(`Error listing folder "${folder}":`, error.message);
    return allFiles;
  }

  for (const item of data || []) {
    const itemPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id === null || !item.metadata) {
      // It's a folder / subdirectory
      const subFiles = await listAllFiles(itemPath);
      allFiles.push(...subFiles);
    } else {
      allFiles.push({
        path: itemPath,
        size: item.metadata.size || 0,
        mimetype: item.metadata.mimetype || "image/jpeg",
      });
    }
  }

  return allFiles;
}

async function optimizeFile(fileInfo) {
  const { path: filePath, size: initialSize } = fileInfo;
  totalInitialBytes += initialSize;

  console.log(`\nProcessing: ${filePath} (${(initialSize / 1024).toFixed(0)} KB)`);

  // Skip tiny files (< 100KB)
  if (initialSize < 100 * 1024) {
    console.log(`  -> Skipped (already small: <100KB)`);
    totalFinalBytes += initialSize;
    return;
  }

  // 1. Download file from Supabase
  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(filePath);

  if (downloadError || !blob) {
    console.error(`  ! Download failed:`, downloadError?.message);
    totalFinalBytes += initialSize;
    return;
  }

  const arrayBuffer = await blob.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  try {
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    let pipeline = image.rotate(); // auto-rotate based on EXIF

    if (
      (metadata.width && metadata.width > MAX_DIMENSION) ||
      (metadata.height && metadata.height > MAX_DIMENSION)
    ) {
      pipeline = pipeline.resize({
        width: metadata.width && metadata.width > metadata.height ? MAX_DIMENSION : undefined,
        height: metadata.height && metadata.height >= metadata.width ? MAX_DIMENSION : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to WebP for optimal compression
    const outputBuffer = await pipeline
      .webp({ quality: QUALITY, effort: 6 })
      .toBuffer();

    if (outputBuffer.length < initialSize) {
      // Upload back to Supabase at same path with upsert
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, outputBuffer, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        console.error(`  ! Failed to upload optimized file:`, uploadError.message);
        totalFinalBytes += initialSize;
      } else {
        totalFinalBytes += outputBuffer.length;
        optimizedCount++;
        const savedKB = ((initialSize - outputBuffer.length) / 1024).toFixed(1);
        const percent = (((initialSize - outputBuffer.length) / initialSize) * 100).toFixed(0);
        console.log(
          `  ✓ SUCCESS: ${(initialSize / 1024).toFixed(0)}KB -> ${(
            outputBuffer.length / 1024
          ).toFixed(0)}KB (saved ${savedKB}KB / -${percent}%)`
        );
      }
    } else {
      console.log(`  -> Kept original (compressed buffer was not smaller)`);
      totalFinalBytes += initialSize;
    }
  } catch (err) {
    console.error(`  ! Sharp error:`, err.message);
    totalFinalBytes += initialSize;
  }
}

async function main() {
  console.log(`Connecting to Supabase Storage bucket: "${BUCKET}"...`);
  const files = await listAllFiles();
  console.log(`Found ${files.length} file(s) in "${BUCKET}" bucket.`);

  if (files.length === 0) {
    console.log("No files found in bucket.");
    return;
  }

  for (const file of files) {
    await optimizeFile(file);
  }

  const initialMB = (totalInitialBytes / (1024 * 1024)).toFixed(2);
  const finalMB = (totalFinalBytes / (1024 * 1024)).toFixed(2);
  const savedMB = ((totalInitialBytes - totalFinalBytes) / (1024 * 1024)).toFixed(2);
  const savedPercent = totalInitialBytes > 0
    ? (((totalInitialBytes - totalFinalBytes) / totalInitialBytes) * 100).toFixed(1)
    : "0";

  console.log("\n=========================================");
  console.log(`Supabase Storage Optimization Completed!`);
  console.log(`Files Processed: ${files.length} (Optimized: ${optimizedCount})`);
  console.log(`Total Size: ${initialMB} MB -> ${finalMB} MB`);
  console.log(`Total Storage Saved: ${savedMB} MB (${savedPercent}% reduction)`);
  console.log("=========================================");
}

main().catch(console.error);
