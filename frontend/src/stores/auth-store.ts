/**
 * Zustand auth store — persists JWT + user info to localStorage.
 *
 * IMPORTANT: Always check `_hasHydrated` before acting on `token`.
 * On a hard refresh, Zustand starts with the default (null) values and
 * asynchronously reads localStorage. If you redirect on `token === null`
 * before hydration completes, the user gets logged out on every refresh.
 *
 * Pattern in protected layouts:
 *   const token       = useAuthStore((s) => s.token);
 *   const hasHydrated = useAuthStore((s) => s._hasHydrated);
 *   // only redirect when hasHydrated && !token
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id:    string;
  email: string;
  name:  string;
}

interface AuthStore {
  token:        string | null;
  user:         AuthUser | null;
  /** true once the store has finished reading from localStorage */
  _hasHydrated: boolean;

  setAuth:          (token: string, user: AuthUser) => void;
  logout:           () => void;
  _setHasHydrated:  (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token:        null,
      user:         null,
      _hasHydrated: false,

      setAuth:  (token, user) => set({ token, user }),
      logout:   () => set({ token: null, user: null }),
      _setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "orqen-auth",
      // Fired once localStorage has been read and the store is patched.
      // Toggling _hasHydrated here lets the layout wait before redirecting.
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);
