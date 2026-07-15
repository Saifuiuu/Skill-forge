import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

function readPersistedTokens() {
  try {
    const raw = localStorage.getItem('skillforge-auth')
    if (!raw) return { accessToken: null, refreshToken: null }
    const parsed = JSON.parse(raw) as {
      state?: { accessToken?: string | null; refreshToken?: string | null }
    }
    return {
      accessToken: parsed.state?.accessToken ?? null,
      refreshToken: parsed.state?.refreshToken ?? null,
    }
  } catch {
    return { accessToken: null, refreshToken: null }
  }
}

api.interceptors.request.use((config) => {
  const { accessToken } = readPersistedTokens()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  // Default Content-Type is application/json; remove it for FormData so the
  // browser can set multipart/form-data with the correct boundary.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      const { refreshToken } = readPersistedTokens()
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${baseURL}/auth/refresh`, {
            refreshToken,
          })
          const { useAuthStore } = await import('../store/authStore')
          useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)
          original.headers.Authorization = `Bearer ${data.accessToken}`
          return api(original)
        } catch {
          const { useAuthStore } = await import('../store/authStore')
          await useAuthStore.getState().logout()
        }
      } else {
        const { useAuthStore } = await import('../store/authStore')
        await useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  },
)
