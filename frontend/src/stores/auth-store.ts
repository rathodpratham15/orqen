/**
 * Zustand auth store — persists JWT + user info to localStorage.
 * Use `useAuthStore.getState()` outside React components.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id:    string;
  email: string;
  name:  string;
}

interface AuthStore {
  token: string | null;
  user:  AuthUser | null;
  setAuth:  (token: string, user: AuthUser) => void;
  logout:   () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user:  null,
      setAuth: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: "orqen-auth" },
  ),
);
