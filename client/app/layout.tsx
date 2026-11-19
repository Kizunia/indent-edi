import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import AppNav, { NavFallback } from "@/components/layout/AppNav";

export const metadata: Metadata = {
  title: "Organize Indent System",
  description: "Create, track, and manage material Indents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <a href="#main" className="skip-link no-print">
          Skip to main content
        </a>
        <div className="flex min-h-screen flex-col md:flex-row">
          {/* The nav reads the session cookie; Suspense keeps it from blocking the page. */}
          <Suspense fallback={<NavFallback />}>
            <AppNav />
          </Suspense>
          <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
