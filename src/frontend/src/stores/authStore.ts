import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Admin {
  id: number
  name: string
  email: string
}

interface AuthState {
  token: string | null
  admin: Admin | null
  setAuth: (token: string, admin: Admin) => void
  clear: () => void
}

// Persisted to localStorage under this key -- see ARCHITECTURE.md,
// Authentication ("Token stored in localStorage (SPA)").
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      setAuth: (token, admin) => set({ token, admin }),
      clear: () => set({ token: null, admin: null }),
    }),
    { name: 'collectors-lib-auth' },
  ),
)
