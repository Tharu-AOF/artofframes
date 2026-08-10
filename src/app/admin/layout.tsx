import type { Metadata } from "next";
import AdminRouteGate from "@/components/admin/AdminRouteGate";

export const metadata: Metadata = {
  title: "Admin — Art of Frames",
  robots: { index: false, follow: false },
};

// The login page renders standalone; every other admin route gets
// the full AdminShell (sidebar + top bar).
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminRouteGate>{children}</AdminRouteGate>;
}
