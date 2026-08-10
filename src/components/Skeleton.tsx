import type { CSSProperties } from "react";

// Skeleton loading block — a shimmer placeholder for content that
// is still streaming in (used by the route-level loading.tsx files
// for /shop and /gallery). Renders a decorative div with the
// .skeleton sweep from globals.css; callers supply sizing/radius
// utilities (rounded-full pills, aspect-square images, etc.).
export default function SkeletonBlock({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      style={style}
    />
  );
}
