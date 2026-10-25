"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { apiClient, SESSION_EXPIRED_EVENT } from "@/lib/api-client"
import { clearBackendSubjectCache } from "@/lib/services/backend-subject-map"
import { browserTimeZone, meService } from "@/lib/services/me-service"

export type LearningStyleKey = "visual" | "auditory" | "kinesthetic" | "reading"
export type Level = "csec" | "cape"

export interface User {
  user_id: number
  id?: number
  email: string
  first_name?: string
  last_name?: string
  firstName?: string
  lastName?: string
  age?: number
  gender?: string
  accountType?: string
  isSuperAdmin?: boolean
  level?: Level
  learning_style?: LearningStyleKey
  timezone?: string
  /** null until the student finishes or skips the Sapphy guide (demo account: kept in this browser) */
  onboardingCompletedAt?: string | null
  isFirstLogin?: boolean
  /** "Form 1"–"Form 5", "Lower 6", "Upper 6"; also caps how hard Sapphy's questions get */
  gradeLevel?: string | null
  schoolType?: string | null
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  /** True for the demo account, which has no backend session */
  isDemo: boolean
  /** True once the session matches the backend's copy of the account (fresh login, or the
   * background check-in after a reload finished). Onboarding prompts wait for this. */
  isSynced: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName?: string, lastName?: string, age?: number, gender?: string, accountType?: string) => Promise<void>
  logout: () => void
  updateUserLevel: (level: Level) => Promise<void>
  updateLearningStyle: (style: LearningStyleKey) => Promise<void>
  /** Save the onboarding quiz's answers; the backend works out the dominant style */
  saveLearningStyleAnswers: (answers: { questionId: number; value: LearningStyleKey }[]) => Promise<LearningStyleKey>
  completeOnboarding: () => Promise<void>
  restartOnboarding: () => Promise<void>
  updateSchoolDetails: (fields: { gradeLevel?: string | null; schoolType?: string | null }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEMO_EMAIL = "andrew.lee@demo.com"
const DEMO_ONBOARDING_KEY = "sapphire_demo_onboarding_done"

// Demo user fallback
const DEMO_USER: User = {
  user_id: 999,
  email: DEMO_EMAIL,
  first_name: "Andrew",
  last_name: "Lee",
  age: 17,
  gender: "male",
  accountType: "student",
  level: undefined,
  learning_style: "visual",
  onboardingCompletedAt: null,
}

const STYLE_FROM_BACKEND: Record<string, LearningStyleKey> = {
  visual: "visual",
  auditory: "auditory",
  kinesthetic: "kinesthetic",
  "reading/writing": "reading",
  reading: "reading",
}

/** One user shape for the whole app, whatever casing the backend or an older session used. */
function normalizeUser(raw: any): User {
  const style = raw?.learning_style ?? raw?.learningStyle
  return {
    ...raw,
    user_id: raw?.user_id ?? raw?.id,
    id: raw?.id ?? raw?.user_id,
    first_name: raw?.first_name ?? raw?.firstName,
    last_name: raw?.last_name ?? raw?.lastName,
    level: raw?.level === "csec" || raw?.level === "cape" ? raw.level : undefined,
    learning_style: style ? STYLE_FROM_BACKEND[String(style).toLowerCase()] : undefined,
    onboardingCompletedAt: raw?.onboardingCompletedAt ?? null,
  }
}

const SESSION_KEYS = ["user", "authToken", "refreshToken", "selectedLevel", "learningStyle"]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSynced, setIsSynced] = useState(false)
  const router = useRouter()
  const isDemo = !!user && user.user_id === DEMO_USER.user_id

  /** Keep state, the stored session and the level/style keys other screens read in step. */
  const persist = useCallback((next: User) => {
    setUser(next)
    try {
      localStorage.setItem("user", JSON.stringify(next))
      if (next.level) localStorage.setItem("selectedLevel", next.level)
      if (next.learning_style) localStorage.setItem("learningStyle", next.learning_style)
    } catch {}
  }, [])

  /** Merge the backend's copy of the account (level, style, onboarding) into the session. */
  const applyServerUser = useCallback(
    (serverUser: any) => {
      setUser((prev) => {
        const merged = normalizeUser({ ...(prev ?? {}), ...serverUser })
        try {
          localStorage.setItem("user", JSON.stringify(merged))
          if (merged.level) localStorage.setItem("selectedLevel", merged.level)
          if (merged.learning_style) localStorage.setItem("learningStyle", merged.learning_style)
        } catch {}
        return merged
      })
    },
    [],
  )

  // Load the stored session, then refresh it from the backend in the background. The check-in
  // also records today's visit (the log-on half of the streak) and the browser's time zone.
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        const parsed = normalizeUser(JSON.parse(storedUser))
        if (parsed.user_id !== DEMO_USER.user_id && !localStorage.getItem("authToken")) {
          // A real account without a token can't reach the backend: sign in again instead of
          // showing a dashboard where nothing loads or saves.
          SESSION_KEYS.forEach((k) => localStorage.removeItem(k))
          setIsSynced(true)
          setIsLoading(false)
          return
        }
        if (parsed.user_id === DEMO_USER.user_id) {
          parsed.level = (localStorage.getItem("selectedLevel") as Level) || undefined
          parsed.onboardingCompletedAt = localStorage.getItem(DEMO_ONBOARDING_KEY)
        }
        setUser(parsed)
        if (localStorage.getItem("authToken")) {
          meService
            .checkIn()
            .then((res) => applyServerUser(res.user))
            .catch(() => {})
            .finally(() => setIsSynced(true))
        } else {
          setIsSynced(true)
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error("Failed to parse stored user:", error)
        localStorage.removeItem("user")
      }
    }
    setIsLoading(false)
  }, [applyServerUser])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      clearBackendSubjectCache()

      // Demo account: no backend, picks a level every time.
      if (email.toLowerCase() === DEMO_EMAIL) {
        const userData = { ...DEMO_USER, email, onboardingCompletedAt: localStorage.getItem(DEMO_ONBOARDING_KEY) }
        ;["authToken", "refreshToken", "selectedLevel"].forEach((k) => localStorage.removeItem(k))
        persist(userData)
        setIsSynced(true)
        router.push("/select-level")
        return
      }

      const response = await apiClient.post<{
        success: boolean
        data: { user: any; token: string; refreshToken?: string; redirectToLearningStyle?: boolean }
      }>("/api/auth/login", { email, password })

      const raw = response.data?.user || (response as any).user
      const token = response.data?.token || (response as any).token
      const refreshToken = response.data?.refreshToken

      if (!raw || !raw.email) {
        throw new Error("Invalid response from server. Please check the backend is configured correctly.")
      }

      if (token) localStorage.setItem("authToken", token)
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken)
      // A different account may have used this browser: drop its level/style before restoring ours.
      localStorage.removeItem("selectedLevel")
      localStorage.removeItem("learningStyle")

      const userData = normalizeUser(raw)
      persist(userData)
      setIsSynced(true)

      // Record the browser's time zone and today's visit; don't hold up navigation for it.
      const tz = browserTimeZone()
      if (tz && tz !== userData.timezone) meService.updateMe({ timezone: tz }).catch(() => {})

      // The level lives on the account, so returning students skip onboarding on every device.
      // The dashboard opens the learning-style quiz itself if it was never finished.
      router.push(userData.level ? "/dashboard" : "/select-level")
    } catch (error: any) {
      console.error("Login error:", error)

      const errorMessage = error.message?.toLowerCase() || ""
      const isNetworkError =
        error.name === "NetworkError" ||
        error.name === "TypeError" ||
        errorMessage.includes("failed to fetch") ||
        errorMessage.includes("failed to connect")

      if (isNetworkError) {
        throw new Error(
          "Cannot connect to server. The backend may be down or your internet connection is unavailable. Please try again later or use the demo account (andrew.lee@demo.com).",
        )
      }
      if (error.status === 429) {
        throw new Error(error.message || "Too many sign-in attempts. Please wait a few minutes and try again.")
      }
      if (error.status === 401) {
        throw new Error("That email and password don't match an account. Check them, or create a new account.")
      }
      throw new Error(error.message || "Invalid email or password. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    age?: number,
    gender?: string,
    accountType?: string,
  ) => {
    try {
      setIsLoading(true)
      clearBackendSubjectCache()

      const signupBody = {
        email,
        password,
        confirmPassword: password,
        firstName,
        lastName,
        age: age !== undefined ? Number(age) : undefined,
        gender,
        accountType: accountType?.toLowerCase(),
      }

      const response = await apiClient.post<{
        success: boolean
        data: { user: any; token: string; refreshToken?: string }
      }>("/api/auth/signup", signupBody)

      const raw = response.data?.user ?? (response as any).user
      const token = response.data?.token ?? (response as any).token
      const refreshToken = response.data?.refreshToken ?? (response as any).refreshToken

      if (!raw || !raw.email) {
        throw new Error("Invalid response from server — no user returned.")
      }

      if (token) localStorage.setItem("authToken", token)
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken)
      localStorage.removeItem("selectedLevel")
      localStorage.removeItem("learningStyle")
      persist(normalizeUser(raw))
      setIsSynced(true)

      const tz = browserTimeZone()
      if (token && tz) meService.updateMe({ timezone: tz }).catch(() => {})

      router.push("/select-level")
    } catch (error: any) {
      console.error("Registration error:", error)
      throw new Error(error.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const onExpired = () => {
      setUser(null)
      clearBackendSubjectCache()
      SESSION_KEYS.forEach((k) => localStorage.removeItem(k))
      router.push("/")
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [router])

  const logout = () => {
    setUser(null)
    clearBackendSubjectCache()
    SESSION_KEYS.forEach((k) => localStorage.removeItem(k))
    router.push("/")
  }

  const updateUserLevel = async (level: Level) => {
    if (!user) return
    persist({ ...user, level })
    if (isDemo) return
    const serverUser = await meService.updateMe({ level })
    clearBackendSubjectCache() // switching level enrolls the new level's subjects
    applyServerUser(serverUser)
  }

  const updateLearningStyle = async (style: LearningStyleKey) => {
    if (!user) return
    persist({ ...user, learning_style: style })
    if (isDemo) return
    applyServerUser(await meService.updateMe({ learningStyle: style }))
  }

  const saveLearningStyleAnswers = async (answers: { questionId: number; value: LearningStyleKey }[]) => {
    // Same rule as the backend: the most common answer wins (first one on a tie).
    const counts = new Map<LearningStyleKey, number>()
    answers.forEach((a) => counts.set(a.value, (counts.get(a.value) ?? 0) + 1))
    let dominant: LearningStyleKey = answers[0]?.value ?? "visual"
    counts.forEach((n, style) => {
      if (n > (counts.get(dominant) ?? 0)) dominant = style
    })
    if (user) persist({ ...user, learning_style: dominant })
    if (!isDemo) {
      await meService.saveLearningStyle(answers)
      applyServerUser(await meService.getMe())
    }
    return dominant
  }

  const completeOnboarding = async () => {
    if (!user) return
    const now = new Date().toISOString()
    persist({ ...user, onboardingCompletedAt: now })
    if (isDemo) {
      localStorage.setItem(DEMO_ONBOARDING_KEY, now)
      return
    }
    applyServerUser(await meService.updateMe({ onboardingCompleted: true }))
  }

  const updateSchoolDetails = async (fields: { gradeLevel?: string | null; schoolType?: string | null }) => {
    if (!user) return
    persist({ ...user, ...fields })
    if (isDemo) return
    applyServerUser(await meService.updateMe(fields))
  }

  const restartOnboarding = async () => {
    if (!user) return
    persist({ ...user, onboardingCompletedAt: null })
    if (isDemo) {
      localStorage.removeItem(DEMO_ONBOARDING_KEY)
      return
    }
    applyServerUser(await meService.updateMe({ onboardingCompleted: false }))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isDemo,
        isSynced,
        login,
        register,
        logout,
        updateUserLevel,
        updateLearningStyle,
        saveLearningStyleAnswers,
        completeOnboarding,
        restartOnboarding,
        updateSchoolDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
