import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, getToken, setToken } from './api'

export type AuthUser = {
  id: number
  username: string
  email: string | null
  avatarLetter: string
  avatarUrl: string
  bio: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  role?: 'user' | 'admin'
}

type UpdateProfileInput = {
  username?: string
  email?: string | null
  avatarUrl?: string
  bio?: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  login: (username: string, password: string) => Promise<AuthUser>
  register: (username: string, email: string | null, password: string) => Promise<AuthUser>
  logout: () => void
  refreshUser: () => Promise<AuthUser | null>
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const isAdmin = user?.role === 'admin'

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const result = await api.get<{ user: AuthUser }>('/auth/me')
        if (!cancelled) {
          setUser(result.user)
        }
      } catch {
        setToken(null)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/auth/login', { username, password })
    setToken(result.token)
    setUser(result.user)
    return result.user
  }, [])

  const register = useCallback(async (username: string, email: string | null, password: string) => {
    const result = await api.post<{ token: string; user: AuthUser }>('/auth/register', {
      username,
      email: email ?? '',
      password,
    })
    setToken(result.token)
    setUser(result.user)
    return result.user
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const result = await api.get<{ user: AuthUser }>('/auth/me')
      setUser(result.user)
      return result.user
    } catch {
      return null
    }
  }, [])

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const result = await api.patch<{ user: AuthUser }>('/auth/me', input)
    setUser(result.user)
    return result.user
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.post<{ ok: true }>('/auth/me/password', { currentPassword, newPassword })
  }, [])

  const deleteAccount = useCallback(async () => {
    await api.delete<{ ok: true; message: string }>('/auth/me', {
      body: { confirm: 'DELETE_MY_ACCOUNT' },
    })
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
      deleteAccount,
    }),
    [user, loading, isAdmin, login, register, logout, refreshUser, updateProfile, changePassword, deleteAccount],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
