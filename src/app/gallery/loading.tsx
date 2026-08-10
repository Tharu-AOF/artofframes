// Route-level loading UI for /gallery — an instant skeleton of the
// gallery page (editorial header, category sidebar and the masonry
// photo grid) that streams from the server while getShopGallery()
// resolves, and also shows on client-side navigation. The real
// content is swapped in automatically once ready.

import Navbar from "@/components/Navbar";
import SkeletonBlock from "@/components/Skeleton";

export default function GalleryLoading() {
  return (
    <main className="min-h-screen bg-[#030712]">
      <Navbar activeOverride="gallery" />
      <section className="relative overflow-clip bg-[#030712] pb-24 pt-28 lg:pb-32 lg:pt-36">
        <p className="sr-only" role="status">
          Loading the gallery…
        </p>

        {/* aria-hidden: the skeleton is decorative — the sr-only
            status text above is what screen readers announce. */}
        <div
          className="relative mx-auto max-w-7xl px-6 lg:px-8"
          aria-hidden="true"
        >
          {/* ── Editorial header placeholder ── */}
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-5">
              <SkeletonBlock className="h-3 w-40 rounded-full" />
              <SkeletonBlock className="h-10 w-64 rounded-full sm:h-12" />
              <SkeletonBlock className="h-10 w-72 rounded-full sm:h-12" />
            </div>
            <SkeletonBlock className="h-16 w-full max-w-md rounded-2xl" />
          </div>

          {/* ── Sidebar + content ── */}
          <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
            {/* Sidebar */}
            <div className="hidden lg:block">
              <div className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <div className="px-3 pb-3 pt-2">
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                </div>
                <div className="flex flex-col gap-2 border-t border-white/5 pt-2">
                  {[92, 110, 78, 104].map((w, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-1.5"
                    >
                      <SkeletonBlock
                        className="h-3.5 rounded-full"
                        style={{ width: w }}
                      />
                      <SkeletonBlock className="h-3 w-6 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Content column */}
            <div className="min-w-0">
              {/* Mobile categories drawer */}
              <div className="flex flex-wrap gap-2 lg:hidden">
                {[70, 90, 80, 100].map((w, i) => (
                  <SkeletonBlock
                    key={i}
                    className="h-10 rounded-full"
                    style={{ width: w }}
                  />
                ))}
              </div>

              <SkeletonBlock className="mt-4 h-3 w-24 rounded-full lg:mt-0" />

              {/* Masonry tiles — varied heights to mimic the grid */}
              <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
                {[260, 340, 300, 220, 380, 280, 320, 240, 300].map((h, i) => (
                  <SkeletonBlock
                    key={i}
                    className="mb-4 break-inside-avoid rounded-2xl"
                    style={{ height: h }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
