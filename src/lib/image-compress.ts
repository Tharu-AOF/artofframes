// ============================================================
// IMAGE COMPRESSOR — client-side browser canvas optimization
//
// Converts raw JPEG/PNG/WebP uploads (often 4MB–15MB from phone
// cameras) into lightweight, high-fidelity WebP images (< 250KB)
// BEFORE uploading to Supabase Storage.
//
// Benefits:
// 1. Prevents Netlify Image Optimization Serverless timeouts (504s).
// 2. Reduces Supabase storage consumption by 85%–95%.
// 3. Instant page loads on mobile & slow 4G connections.
// ============================================================

export interface CompressOptions {
  /** Max width or height in pixels. Default: 1600 (ideal for retina & lightboxes) */
  maxDimension?: number;
  /** WebP compression quality (0 to 1). Default: 0.82 */
  quality?: number;
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const { maxDimension = 1600, quality = 0.82 } = options;

  // Don't compress non-images or tiny vector files (e.g. SVGs)
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  // If already under 120KB and in WebP, no need to touch
  if (file.size < 120 * 1024 && file.type === "image/webp") {
    return file;
  }

  // Only run in browser environment
  if (typeof window === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;

    // Calculate aspect ratio scale
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    // Use OffscreenCanvas if available, else standard HTMLCanvasElement
    let blob: Blob | null = null;

    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);

      blob = await canvas.convertToBlob({
        type: "image/webp",
        quality,
      });
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, width, height);

      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/webp", quality);
      });
    }

    if (!blob) return file;

    // Build replacement file name with .webp extension
    const baseName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
    const newFileName = `${baseName}.webp`;

    return new File([blob], newFileName, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Client-side image compression fallback to original:", err);
    return file;
  }
}
