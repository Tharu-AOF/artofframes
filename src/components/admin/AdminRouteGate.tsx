"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

// Renders the admin shell (sidebar + top bar) around every admin
// page except the login screen, which stands alone.
export default function AdminRouteGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname.startsWith("/admin/login");
  if (isLogin) return <>{children}</>;
  return <AdminShell>{children}</AdminShell>;
}
