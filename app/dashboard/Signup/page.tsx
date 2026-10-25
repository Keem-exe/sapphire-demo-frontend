"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { AuthShell } from "@/components/auth-shell"
import { cn } from "@/lib/utils"
import { AlertCircle, BookOpen, GraduationCap } from "lucide-react"

export default function SignUpPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("")
  const [accountType, setAccountType] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError("First and last name must be at least 2 characters")
      return
    }

    const parsedAge = Number(age)
    if (!age || Number.isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
      setError("Please enter a valid age between 10 and 120")
      return
    }

    setIsLoading(true)
    try {
      // register() takes the new student to level selection itself
      await register(email, password, firstName, lastName, parsedAge, gender, accountType)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const fieldClass = "h-11 rounded-2xl"
  const selectClass =
    "h-11 w-full rounded-2xl border border-input bg-card px-3.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

  return (
    <AuthShell tagline="Create your account and get study tools built around your subjects and your exam date.">
      <Card className="w-full max-w-[480px] gap-0 rounded-3xl border-border p-8 shadow-lg">
        <div className="mb-6 space-y-1.5">
          <h2 className="text-[32px] font-bold leading-[38px]">Create your account</h2>
          <p className="text-[15px] leading-[22px] text-muted-foreground">Join Sapphire OS and start your journey</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-[18px]">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
                className={fieldClass}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="15"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                required
                className={selectClass}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium leading-none">I am a</legend>
            <div className="flex gap-0.5 rounded-xl bg-muted p-[3px]" role="radiogroup" aria-label="Account type">
              {[
                { value: "Student", Icon: GraduationCap },
                { value: "Teacher", Icon: BookOpen },
              ].map(({ value, Icon }) => (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-muted-foreground has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                    accountType === value && "bg-card text-foreground shadow-xs",
                  )}
                >
                  <input
                    type="radio"
                    name="accountType"
                    value={value}
                    checked={accountType === value}
                    onChange={(e) => setAccountType(e.target.value)}
                    required
                    className="sr-only"
                  />
                  <Icon className="size-4" aria-hidden="true" />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={fieldClass}
            />
            <span className="text-xs text-muted-foreground">At least 8 characters.</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className={fieldClass}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <Button type="submit" className="h-11 w-full rounded-2xl font-semibold" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </Card>
    </AuthShell>
  )
}
