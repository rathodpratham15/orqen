"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router      = useRouter();
  const token       = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    // Only redirect AFTER Zustand has finished reading from localStorage.
    // Without this guard, a hard refresh sees token=null (the store default)
    // and immediately redirects before localStorage is loaded.
    if (hasHydrated && !token) {
      router.replace("/login");
    }
  }, [token, hasHydrated, router]);

  // Waiting for localStorage → show spinner, never redirect yet
  if (!hasHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Hydrated but no token → useEffect will redirect; show spinner while navigating
  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0A0A0F]">
        <div className="h-6 w-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden ml-16">
        {children}
      </main>
    </div>
  );
}
