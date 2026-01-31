"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api-client"

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

// Demo user fallback
const DEMO_USER: User = {
  user_id: 999,
  email: "andrew.lee@demo.com",
  first_name: "Andrew",
  last_name: "Lee",
  age: 17,
  gender: "male",
  accountType: "student",
  level: undefined,
  learning_style: "visual",
}

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
      setIsLoading(true)
      
      // Check for demo user credentials - only specific demo email
      if (email.toLowerCase() === "andrew.lee@demo.com") {
        const userData = { ...DEMO_USER, email }
        setUser(userData)
        localStorage.setItem("user", JSON.stringify(userData))
        router.push("/select-level")
        return
      }
      
      // All other users must authenticate with the backend
      const response = await apiClient.post<{ user: User; token?: string }>("/auth/login", {
        email,
        password,
      })
      
      const userData = response.user
      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))
      
      if (response.token) {
        localStorage.setItem("authToken", response.token)
      }

      // Redirect based on whether user has selected level
      if (!userData.level) {
        router.push("/select-level")
      } else {
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      
      // Check if user doesn't exist (404 or specific error messages)
      const errorMessage = error.message?.toLowerCase() || ''
      if (error.status === 404 || errorMessage.includes('user not found') || errorMessage.includes('does not exist') || errorMessage.includes('no user found')) {
        throw new Error("This account doesn't exist. Please check your email or register for a new account.")
      }
      
      // Check for wrong password (401 or specific error messages)
      if (error.status === 401 || errorMessage.includes('incorrect password') || errorMessage.includes('invalid password') || errorMessage.includes('wrong password')) {
        throw new Error("Incorrect password. Please try again.")
      }
      
      // Generic authentication error
      throw new Error(error.message || "Invalid email or password. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, password: string, firstName?: string, lastName?: string, age?: number, gender?: string, accountType?: string) => {
    try {
      setIsLoading(true)
      
      // Call backend register endpoint
      const response = await apiClient.post<{ user: User; token?: string }>("/auth/register", {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        age,
        gender,
        accountType,
      })
      
      const userData = response.user
      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))
      
      if (response.token) {
        localStorage.setItem("authToken", response.token)
      }

      router.push("/select-level")
    } catch (error: any) {
      console.error("Registration error:", error)
      throw new Error(error.message || "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("authToken")
    localStorage.removeItem("selectedLevel")
    localStorage.removeItem("learningStyle")
    router.push("/")
  }

  const updateUserLevel = async (level: "csec" | "cape") => {
    if (user) {
      const updatedUser = { ...user, level }
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
      localStorage.setItem("selectedLevel", level)
      
      // Update backend
      try {
        await apiClient.put(`/users/${user.user_id}`, { level })
      } catch (error) {
        console.error("Failed to update level on backend:", error)
      }
    }
  }

  const updateLearningStyle = async (style: "visual" | "auditory" | "kinesthetic" | "reading") => {
    if (user) {
      const updatedUser = { ...user, learning_style: style }
      setUser(updatedUser)
      localStorage.setItem("user", JSON.stringify(updatedUser))
      localStorage.setItem("learningStyle", style)
      
      // Update backend
      try {
        await apiClient.put(`/users/${user.user_id}`, { learning_style: style })
      } catch (error) {
        console.error("Failed to update learning style on backend:", error)
      }
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
