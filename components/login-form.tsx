"use client"

import type React from "react"
import Link from "next/link"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      await login(email, password)
    } catch (err: any) {
      const errorMessage = err.message || "Invalid email or password. Please try again."
      setError(errorMessage)
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if error is about user not existing
  const isUserNotFoundError = error.toLowerCase().includes("doesn't exist") || 
                               error.toLowerCase().includes("does not exist") ||
                               error.toLowerCase().includes("no user found")

  return (
    <Card className="border-2 shadow-2xl backdrop-blur-sm bg-card/95">
      <CardHeader className="space-y-4 text-center pb-8">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Welcome to Sapphire
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Your AI study companion for CXC success
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
              <p className="text-destructive text-sm">{error}</p>
              {isUserNotFoundError && (
                <div className="pt-2 border-t border-destructive/20">
                  <Link href="/dashboard/Signup" className="text-sm text-primary hover:underline font-medium">
                    → Create a new account here
                  </Link>
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="text-center">
            {/* ⬇ This makes the login page link to the sign-up page */}
            <Button type="button" variant="ghost" className="text-sm text-muted-foreground hover:text-primary transition-colors" asChild>
              <Link href="/dashboard/Signup">Dont have an account? Sign Up!</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
