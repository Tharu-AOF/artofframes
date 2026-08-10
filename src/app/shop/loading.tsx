// Route-level loading UI for /shop — an instant skeleton of the
// collection page (offers carousel, category sidebar, toolbar and the
// product grid) that streams from the server while getShopData() /
// getShopOffers() resolve, and also shows on client-side navigation.
// The real content is swapped in automatically once ready.

import Navbar from "@/components/Navbar";
import SkeletonBlock from "@/components/Skeleton";

export default function ShopLoading() {
  return (
    <main className="min-h-screen bg-[#030712]">
      <Navbar activeOverride="shop" />
      <section className="relative overflow-clip bg-[#030712] pb-24 pt-28 lg:pb-32 lg:pt-36">
        <p className="sr-only" role="status">
          Loading the collection…
        </p>

        {/* aria-hidden: the skeleton is decorative — the sr-only
            status text above is what screen readers announce. */}
        <div
          className="relative mx-auto max-w-7xl px-6 lg:px-8"
          aria-hidden="true"
        >
          {/* ── Offers carousel placeholder ── */}
          <div className="mt-6 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 sm:p-8">
            <div className="flex h-[300px] flex-col justify-between gap-6 sm:h-[320px]">
              <div className="flex items-start justify-between gap-4">
                <SkeletonBlock className="h-4 w-44 rounded-full" />
                <SkeletonBlock className="h-7 w-28 rounded-full" />
              </div>
              <div className="flex flex-col gap-3">
                <SkeletonBlock className="h-9 w-3/4 max-w-md rounded-full" />
                <SkeletonBlock className="h-4 w-1/2 max-w-sm rounded-full" />
              </div>
              <div className="flex items-end justify-between gap-4">
                <SkeletonBlock className="h-11 w-40 rounded-full" />
                <SkeletonBlock className="h-9 w-24 rounded-full" />
              </div>
            </div>
          </div>

          {/* ── Shop by Category placeholder ── */}
          <div className="mt-14 lg:mt-20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex max-w-2xl flex-col gap-3">
                <SkeletonBlock className="h-3 w-40 rounded-full" />
                <SkeletonBlock className="h-9 w-64 rounded-full sm:h-10" />
              </div>
              <SkeletonBlock className="h-4 w-full max-w-md rounded-full" />
            </div>
            <div className="mt-8 flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-6 sm:gap-4 sm:overflow-visible sm:pb-0">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex min-h-[170px] min-w-[132px] shrink-0 flex-col gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:min-h-[180px] sm:min-w-0"
                >
                  <SkeletonBlock className="h-9 w-9 rounded-xl sm:h-10 sm:w-10" />
                  <SkeletonBlock className="mt-auto h-4 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* ── Sidebar + content ── */}
          <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
            {/* Sidebar */}
            <div className="hidden lg:block">
              <div className="flex flex-col gap-1 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                <div className="px-3 pb-3 pt-2">
                  <SkeletonBlock className="h-3 w-20 rounded-full" />
                </div>
                <div className="flex flex-col gap-2 border-t border-white/5 pt-2">
                  {[88, 104, 72, 96, 60, 112, 84, 100].map((w, i) => (
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
              {/* Toolbar — mobile categories button, search, sort */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SkeletonBlock className="h-11 w-32 rounded-xl lg:hidden" />
                <SkeletonBlock className="h-11 w-full rounded-xl sm:max-w-xs" />
                <SkeletonBlock className="h-11 w-44 rounded-xl sm:ml-auto" />
              </div>

              <SkeletonBlock className="mt-6 h-3 w-24 rounded-full" />

              {/* Grid — a signature feature card + product cards */}
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 lg:gap-5">
                <div className="sm:col-span-2">
                  <div className="flex h-full min-h-[340px] flex-col justify-end gap-4 rounded-3xl border border-white/5 bg-white/[0.02] p-8 lg:min-h-[440px]">
                    <SkeletonBlock className="h-4 w-32 rounded-full" />
                    <SkeletonBlock className="h-8 w-3/4 max-w-md rounded-full" />
                    <SkeletonBlock className="h-4 w-2/3 max-w-md rounded-full" />
                    <div className="mt-2 flex flex-wrap gap-3">
                      <SkeletonBlock className="h-11 w-36 rounded-full" />
                      <SkeletonBlock className="h-11 w-32 rounded-full" />
                    </div>
                  </div>
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]"
                  >
                    <SkeletonBlock className="aspect-square w-full rounded-none" />
                    <div className="flex flex-1 flex-col gap-2.5 p-4">
                      <SkeletonBlock className="h-3 w-1/3 rounded-full" />
                      <SkeletonBlock className="h-4 w-2/3 rounded-full" />
                      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                        <SkeletonBlock className="h-6 w-16 rounded-full" />
                        <SkeletonBlock className="h-9 w-28 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
