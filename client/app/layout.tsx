import type { Metadata } from "next";
import "./globals.css";
import SideNav from "@/components/SideNav";

export const metadata: Metadata = {
  title: "Organize Indent System",
  description: "Create, track, and manage material Indents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <SideNav />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
