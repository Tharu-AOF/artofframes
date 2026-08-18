import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Disable sharp file cache on Windows so files aren't locked
sharp.cache(false);

const IMAGES_DIR = path.resolve(process.cwd(), "public/images");
const MAX_DIMENSION = 1600;
const QUALITY = 82;

let totalInitialBytes = 0;
let totalFinalBytes = 0;
let processedCount = 0;

async function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
      continue;
    }

    const inputBuffer = fs.readFileSync(fullPath);
    const initialSize = inputBuffer.length;
    totalInitialBytes += initialSize;

    // Only process files larger than 100KB
    if (initialSize < 100 * 1024) {
      totalFinalBytes += initialSize;
      continue;
    }

    try {
      const image = sharp(inputBuffer);
      const metadata = await image.metadata();

      let pipeline = image.rotate(); // auto-rotate based on EXIF

      // Resize if dimensions exceed MAX_DIMENSION
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

      // Format-specific optimization (preserving file extension so no code breakage)
      if (ext === ".jpg" || ext === ".jpeg") {
        pipeline = pipeline.jpeg({ quality: QUALITY, mozjpeg: true });
      } else if (ext === ".png") {
        if (metadata.hasAlpha) {
          pipeline = pipeline.png({ compressionLevel: 9, quality: QUALITY, effort: 7 });
        } else {
          pipeline = pipeline.png({ compressionLevel: 9, effort: 7 });
        }
      } else if (ext === ".webp") {
        pipeline = pipeline.webp({ quality: QUALITY, effort: 6 });
      }

      const buffer = await pipeline.toBuffer();

      // Only overwrite if optimized buffer is actually smaller
      if (buffer.length < initialSize) {
        fs.writeFileSync(fullPath, buffer);
        totalFinalBytes += buffer.length;
        processedCount++;
        const savedKB = ((initialSize - buffer.length) / 1024).toFixed(1);
        console.log(
          `✓ ${path.relative(IMAGES_DIR, fullPath)}: ${(initialSize / 1024).toFixed(0)}KB -> ${(
            buffer.length / 1024
          ).toFixed(0)}KB (saved ${savedKB}KB)`
        );
      } else {
        totalFinalBytes += initialSize;
      }
    } catch (err) {
      console.warn(`! Failed to process ${fullPath}:`, err.message);
      totalFinalBytes += initialSize;
    }
  }
}

async function main() {
  console.log(`Starting image optimization in: ${IMAGES_DIR}`);
  await processDirectory(IMAGES_DIR);

  const initialMB = (totalInitialBytes / (1024 * 1024)).toFixed(2);
  const finalMB = (totalFinalBytes / (1024 * 1024)).toFixed(2);
  const savedMB = ((totalInitialBytes - totalFinalBytes) / (1024 * 1024)).toFixed(2);
  const savedPercent = (((totalInitialBytes - totalFinalBytes) / totalInitialBytes) * 100).toFixed(1);

  console.log("\n=========================================");
  console.log(`Optimized ${processedCount} images.`);
  console.log(`Total Size: ${initialMB} MB -> ${finalMB} MB`);
  console.log(`Total Saved: ${savedMB} MB (${savedPercent}% reduction)`);
  console.log("=========================================");
}

main().catch(console.error);
