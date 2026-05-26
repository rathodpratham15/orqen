import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Orqen — AI Workflow Operating System",
  description: "Visual workflow builder with multi-agent orchestration and full observability",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen flex overflow-hidden bg-[#0A0A0F]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden ml-16">
          {children}
        </main>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#12121A",
              border: "1px solid #1E1E2E",
              color: "#F1F5F9",
            },
          }}
        />
      </body>
    </html>
  );
}
