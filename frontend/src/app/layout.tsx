import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Orqen — AI Workflow Operating System",
  description: "Visual workflow builder with multi-agent orchestration and full observability",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen bg-[#0A0A0F]">
        {children}
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
