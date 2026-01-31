"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  user_id: number
  email: string
  first_name?: string
  last_name?: string
  age?: number
  gender?: string
  accountType?: string
  level?: "csec" | "cape"
  learning_style?: "visual" | "auditory" | "kinesthetic" | "reading"
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName?: string, lastName?: string, age?: number, gender?: string, accountType?: string) => Promise<void>
  logout: () => void
  updateUserLevel: (level: "csec" | "cape") => void
  updateLearningStyle: (style: "visual" | "auditory" | "kinesthetic" | "reading") => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const SUPABASE_URL = "https://fpbyreqfjdlsgmzvknuq.supabase.co"
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwYnlyZXFmamRsc2dtenZrbnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3OTEwMTMsImV4cCI6MjA3NjM2NzAxM30.3AyTahoVB4mUzOnN74PbC7DiT7TbYzSlGOV_RYhtYR4"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser)
        const learningStyle = localStorage.getItem("learningStyle")
        if (learningStyle) {
          parsedUser.learning_style = learningStyle
        }
        setUser(parsedUser)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') console.error("Failed to parse stored user:", error)
        localStorage.removeItem("user")
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      // Demo auth - accept any email/password
      const userData = {
        user_id: 1,
        email: email,
        first_name: "Demo",
        last_name: "User",
        age: 17,
        gender: "prefer not to say",
        accountType: "student",
        level: undefined, // Force level selection
        learning_style: "visual" as const,
      }
      
      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))

      // Redirect to level selection
      router.push("/select-level")
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const register = async (email: string, password: string, firstName?: string, lastName?: string, age?: int, gender?: string, accountType?: string) => {
    try {
      // Demo registration - accept any input
      const userData = {
        user_id: Math.floor(Math.random() * 10000),
        email: email,
        first_name: firstName || "Demo",
        last_name: lastName || "User",
        age: age || 17,
        gender: gender || "prefer not to say",
        accountType: accountType || "student",
        level: undefined,
        learning_style: "visual" as const,
      }
      
      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))
      router.push("/select-level")
    } catch (error) {
      console.error("Registration error:", error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("selectedLevel")
    localStorage.removeItem("learningStyle")
    router.push("/")
  }

  const updateUserLevel = (level: "csec" | "cape") => {
    if (user) {
      const updatedUser = { ...user, level }
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
      localStorage.setItem("selectedLevel", level)
    }
  }

  const updateLearningStyle = (style: "visual" | "auditory" | "kinesthetic" | "reading") => {
    if (user) {
      const updatedUser = { ...user, learning_style: style }
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
      localStorage.setItem("learningStyle", style)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUserLevel, updateLearningStyle }}>
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
