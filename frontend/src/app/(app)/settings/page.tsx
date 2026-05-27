"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, Loader2, Trash2, Key } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import type { APIKeyStatus } from "@/lib/types";

const PROVIDERS: { id: string; label: string; color: string; placeholder: string; hint: string }[] = [
  {
    id:          "anthropic",
    label:       "Anthropic",
    color:       "text-violet-400",
    placeholder: "sk-ant-api03-…",
    hint:        "Powers Claude (Sonnet, Opus, Haiku) — used by LLM + Agent nodes",
  },
  {
    id:          "openai",
    label:       "OpenAI",
    color:       "text-emerald-400",
    placeholder: "sk-proj-…",
    hint:        "Powers GPT-4o, GPT-4o-mini, GPT-4-turbo — used by LLM node",
  },
  {
    id:          "google",
    label:       "Google Gemini",
    color:       "text-blue-400",
    placeholder: "AIza…",
    hint:        "Powers Gemini 2.0 Flash, 1.5 Pro — used by LLM node",
  },
  {
    id:          "groq",
    label:       "Groq",
    color:       "text-orange-400",
    placeholder: "gsk_…",
    hint:        "Ultra-fast inference — Llama-3.3, Mixtral, Gemma — used by LLM node",
  },
];

interface KeyState {
  value:   string;
  show:    boolean;
  saving:  boolean;
  deleting:boolean;
}

export default function SettingsPage() {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [statuses, setStatuses] = useState<Record<string, APIKeyStatus>>({});
  const [keys,     setKeys]     = useState<Record<string, KeyState>>(() =>
    Object.fromEntries(PROVIDERS.map((p) => [
      p.id,
      { value: "", show: false, saving: false, deleting: false },
    ]))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.settings.listAPIKeys()
      .then((list) => {
        const map: Record<string, APIKeyStatus> = {};
        list.forEach((s) => { map[s.provider] = s; });
        setStatuses(map);
      })
      .catch(() => toast.error("Failed to load API keys"))
      .finally(() => setLoading(false));
  }, []);

  function setKeyField(provider: string, field: Partial<KeyState>) {
    setKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], ...field } }));
  }

  async function handleSave(provider: string) {
    const val = keys[provider].value.trim();
    if (!val) { toast.error("Enter a key before saving"); return; }
    setKeyField(provider, { saving: true });
    try {
      const updated = await api.settings.setAPIKey(provider, val);
      setStatuses((prev) => ({ ...prev, [provider]: updated }));
      setKeyField(provider, { value: "" });
      toast.success(`${PROVIDERS.find(p => p.id === provider)?.label} key saved`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setKeyField(provider, { saving: false });
    }
  }

  async function handleDelete(provider: string) {
    setKeyField(provider, { deleting: true });
    try {
      await api.settings.deleteAPIKey(provider);
      setStatuses((prev) => {
        const next = { ...prev };
        if (next[provider]) next[provider] = { ...next[provider], is_set: false };
        return next;
      });
      toast.success(`${PROVIDERS.find(p => p.id === provider)?.label} key removed`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove key");
    } finally {
      setKeyField(provider, { deleting: false });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-8 py-8 max-w-[860px] mx-auto w-full">
      <h1 className="text-3xl font-bold tracking-tight text-slate-100">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">Manage your account and API keys</p>

      {/* ── Account ─────────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Account
        </h2>
        <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              window.location.href = "/login";
            }}
            className="text-xs text-slate-400 hover:text-red-400 border border-[#2a2a40] hover:border-red-500/30 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* ── API Keys ─────────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">
          API Keys
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Your keys are encrypted at rest. They are used by workflow nodes at runtime.
          If a key is not set, the server&apos;s fallback key is used (if any).
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-zinc-600" />
          </div>
        ) : (
          <div className="space-y-3">
            {PROVIDERS.map((provider) => {
              const status  = statuses[provider.id];
              const keyState = keys[provider.id];
              const isSet   = status?.is_set ?? false;

              return (
                <div
                  key={provider.id}
                  className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <Key size={15} className={provider.color} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">
                            {provider.label}
                          </span>
                          {isSet && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                              <Check size={9} />
                              Configured
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{provider.hint}</p>
                      </div>
                    </div>
                    {isSet && (
                      <button
                        onClick={() => handleDelete(provider.id)}
                        disabled={keyState.deleting}
                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        {keyState.deleting
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Trash2 size={12} />
                        }
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Key input */}
                  <div className="mt-4 flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={keyState.show ? "text" : "password"}
                        value={keyState.value}
                        onChange={(e) => setKeyField(provider.id, { value: e.target.value })}
                        placeholder={isSet ? "Enter new key to replace…" : provider.placeholder}
                        className="w-full bg-[#1a1a2e] border border-[#2a2a40] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-violet-500 font-mono pr-9 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setKeyField(provider.id, { show: !keyState.show })}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {keyState.show ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <button
                      onClick={() => handleSave(provider.id)}
                      disabled={keyState.saving || !keyState.value.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
                    >
                      {keyState.saving && <Loader2 size={11} className="animate-spin" />}
                      {isSet ? "Update" : "Save"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
