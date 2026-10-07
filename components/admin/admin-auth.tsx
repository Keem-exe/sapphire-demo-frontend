"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { ADMIN_KEYS, UNAUTHORIZED_EVENT, adminSession, api } from "@/lib/admin/api"
import type { AdminUser } from "@/lib/admin/types"

interface AdminAuth {
  user: AdminUser | null
  ready: boolean
  /** Set when a valid non-admin account tried to sign in */
  denied: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearDenied: () => void
}

const Ctx = createContext<AdminAuth | null>(null)

export function useAdmin() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useAdmin must be used inside AdminAuthProvider")
  return ctx
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [ready, setReady] = useState(false)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADMIN_KEYS.user)
      const parsed = raw ? JSON.parse(raw) : null
      if (parsed?.accountType === "admin" && adminSession.token()) setUser(parsed)
    } catch {
      adminSession.clear()
    }
    setReady(true)

    const onUnauthorized = () => setUser(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // Errors (including the verbatim "account suspended" 401 message) propagate to the form.
    const { data } = await api.login(email, password)
    if (data.user?.accountType !== "admin") {
      // Fail fast; do not keep a session that can only produce 403s.
      await api.logout(data.token)
      setDenied(true)
      return
    }
    adminSession.save(data.token, data.refreshToken, data.user)
    setDenied(false)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    adminSession.clear()
    setUser(null)
  }, [])

  return (
    <Ctx.Provider value={{ user, ready, denied, login, logout, clearDenied: () => setDenied(false) }}>
      {children}
    </Ctx.Provider>
  )
}
