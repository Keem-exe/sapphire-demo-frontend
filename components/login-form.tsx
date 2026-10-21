"use client"

import type React from "react"
import Link from "next/link"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

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
  
  // Check if it's a network/connection error
  const isNetworkError = error.toLowerCase().includes("cannot connect") ||
                         error.toLowerCase().includes("failed to connect") ||
                         error.toLowerCase().includes("backend may be down")

  return (
    <Card className="w-full max-w-[520px] gap-0 rounded-3xl border-border p-10 shadow-lg">
      <div className="mb-8 space-y-2">
        <h2 className="text-4xl font-bold leading-[42px]">Welcome back</h2>
        <p className="text-base leading-6 text-muted-foreground">Log in to keep your study streak going.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
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
            className="h-12 rounded-2xl"
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
            className="h-12 rounded-2xl"
          />
        </div>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div className="space-y-2">
              <p className="text-destructive">{error}</p>
              {isUserNotFoundError && (
                <div className="border-t border-destructive/20 pt-2">
                  <Link href="/dashboard/Signup" className="text-sm font-medium text-primary hover:underline">
                    → Create a new account here
                  </Link>
                </div>
              )}
              {isNetworkError && (
                <div className="border-t border-destructive/20 pt-2">
                  <p className="text-sm text-muted-foreground">
                    💡 You can use the demo account while the server is unavailable:
                  </p>
                  <p className="mt-1 rounded bg-muted px-2 py-1 font-mono text-sm">andrew.lee@demo.com</p>
                </div>
              )}
            </div>
          </div>
        )}
        <Button type="submit" className="h-12 w-full rounded-2xl text-base font-semibold" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Log in"}
        </Button>
      </form>
      <Button
        asChild
        variant="outline"
        className="mt-5 h-12 w-full rounded-2xl border-primary text-base font-semibold text-primary-strong shadow-none"
      >
        <Link href="/dashboard/Signup">New here? Create an account</Link>
      </Button>
    </Card>
  )
}
