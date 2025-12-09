"use client";

import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { useDirection } from "@/contexts/DirectionContext";

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  const { direction } = useDirection();

  return (
    <div className={`min-h-screen bg-gray-50 flex ${direction === "rtl" ? "flex-row-reverse" : ""}`} dir={direction}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar />

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

