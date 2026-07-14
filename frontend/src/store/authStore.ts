import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'
import type { AuthResponse, AuthUser } from '../types/auth'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (fullName: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  hydrateProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      login: async (email, password) => {
        const { data } = await api.post<AuthResponse>('/auth/login', {
          email,
          password,
        })
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        })
      },

      register: async (fullName, email, password) => {
        const { data } = await api.post<AuthResponse>('/auth/register', {
          fullName,
          email,
          password,
        })
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        })
      },

      logout: async () => {
        try {
          if (get().accessToken) {
            await api.post('/auth/logout')
          }
        } catch {
          // ignore network errors on logout
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      hydrateProfile: async () => {
        if (!get().accessToken) return
        try {
          const { data } = await api.get<AuthUser>('/auth/profile')
          set({ user: data, isAuthenticated: true })
        } catch {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'skillforge-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
