"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

/**
 * /auth/callback — landing page after Google OAuth redirect.
 *
 * Google → backend → redirect here with ?token=<jwt>
 * We store the token in Zustand (localStorage) and navigate to the app.
 *
 * Also handles ?error=<msg> from the backend if OAuth fails.
 *
 * NOTE: useSearchParams() must be inside a <Suspense> boundary or Next.js
 * will error during static generation ("missing-suspense-with-csr-bailout").
 * The outer page exports a Suspense wrapper; the logic lives in <CallbackInner>.
 */

function CallbackInner() {
  const router        = useRouter();
  const params        = useSearchParams();
  const setAuth       = useAuthStore((s) => s.setAuth);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      setErr(decodeURIComponent(error));
      return;
    }

    if (!token) {
      setErr("No token received from OAuth provider");
      return;
    }

    // Store token first so api.ts attaches it as Bearer header on /auth/me
    useAuthStore.getState().setAuth(token, { id: "", email: "", name: "" });

    // Then fetch real user info
    import("@/lib/api").then(({ api }) =>
      api.auth.me()
        .then((user) => {
          setAuth(token, user);
          router.replace("/");
        })
        .catch(() => {
          // Fallback: decode JWT payload for minimal user info
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            setAuth(token, {
              id:    payload.sub ?? "",
              email: payload.email ?? "",
              name:  payload.name ?? "User",
            });
            router.replace("/");
          } catch {
            setErr("Failed to validate token. Please try logging in again.");
          }
        })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (err) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="text-sm font-medium text-red-300">Google sign-in failed</p>
          <p className="mt-1 text-xs text-slate-500">{err}</p>
          <button
            onClick={() => router.replace("/login")}
            className="mt-4 text-xs text-violet-400 hover:text-violet-300 underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      <p className="text-sm text-slate-400">Completing sign-in…</p>
    </div>
  );
}

// Spinner shown while CallbackInner suspends (during static generation)
function LoadingFallback() {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CallbackInner />
    </Suspense>
  );
}
