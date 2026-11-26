"use client";

import React from "react";
import { usePathname } from "next/navigation";

export default function RootTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Key only on top-level segment changes outside /admin so admin sub-navigation
  // animates smoothly inside AdminShell without re-mounting the entire shell.
  const isAdminRoute = pathname.includes("/admin");
  const templateKey = isAdminRoute ? "admin-shell-root" : pathname;

  return (
    <div key={templateKey} className="animate-page-enter flex-1 flex flex-col">
      {children}
    </div>
  );
}
