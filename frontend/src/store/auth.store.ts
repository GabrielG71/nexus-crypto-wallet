import { create } from 'zustand'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  userId: string | null
  email: string | null
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  hydrate: () => void
}

function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  userId: null,
  email: null,

  setTokens: (accessToken, refreshToken) => {
    const payload = parseJwt(accessToken)
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    set({
      accessToken,
      refreshToken,
      userId: payload?.sub ?? null,
      email: payload?.email ?? null,
    })
  },

  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ accessToken: null, refreshToken: null, userId: null, email: null })
  },

  hydrate: () => {
    const accessToken = localStorage.getItem('access_token')
    const refreshToken = localStorage.getItem('refresh_token')
    if (accessToken && refreshToken) {
      const payload = parseJwt(accessToken)
      set({ accessToken, refreshToken, userId: payload?.sub, email: payload?.email })
    }
  },
}))