"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Toaster } from "sonner"
import {
  Activity,
  BookOpen,
  Brain,
  LayoutDashboard,
  Loader2,
  LogOut,
  ScrollText,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useApi } from "@/lib/admin/use-api"
import type { Setting } from "@/lib/admin/types"
import { AdminAuthProvider, useAdmin } from "./admin-auth"
import { ErrorNote, FormField, fullName } from "./common"

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/curriculum", label: "Curriculum", icon: BookOpen },
  { href: "/admin/reels", label: "Reels", icon: Video },
  { href: "/admin/moderation", label: "Content Moderation", icon: ShieldAlert },
  { href: "/admin/intelligence", label: "Intelligence", icon: Brain },
  { href: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: SettingsIcon },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <Gate>{children}</Gate>
      <Toaster richColors position="top-right" />
    </AdminAuthProvider>
  )
}

function Gate({ children }: { children: React.ReactNode }) {
  const { user, ready, denied } = useAdmin()
  if (!ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (denied) return <AccessDenied />
  if (!user) return <LoginScreen />
  return <Frame>{children}</Frame>
}

function AccessDenied() {
  const { clearDenied } = useAdmin()
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-sm space-y-4 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <h1 className="text-xl font-semibold">You don&apos;t have admin access</h1>
        <p className="text-sm text-muted-foreground">This account is not an administrator. Head back to the main Sapphire app, or sign in with a different account.</p>
        <div className="flex justify-center gap-2">
          <Button asChild><Link href="/">Back to Sapphire</Link></Button>
          <Button variant="outline" onClick={clearDenied}>Try another account</Button>
        </div>
      </div>
    </div>
  )
}

function LoginScreen() {
  const { login } = useAdmin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <form
        className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(undefined)
          try {
            await login(email, password)
          } catch (err) {
            setError((err as Error).message)
          }
          setBusy(false)
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-6 text-primary" />
          <h1 className="text-lg font-semibold">Sapphire Admin</h1>
        </div>
        <ErrorNote message={error} />
        <FormField label="Email">
          <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        <FormField label="Password">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </FormField>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} Sign in
        </Button>
      </form>
    </div>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdmin()
  const pathname = usePathname()
  const { data } = useApi<{ settings: Setting[] }>("/api/admin/settings")
  const maintenance = data?.settings.find((s) => s.key === "maintenance_mode")?.value === true

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b bg-card md:sticky md:top-0 md:h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-4 py-3 md:py-5">
          <Activity className="size-5 text-primary" />
          <span className="font-semibold">Sapphire Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" /> {label}
              </Link>
            )
          })}
        </nav>
        <div className="hidden items-center justify-between gap-2 border-t p-3 md:flex">
          <div className="min-w-0 text-xs">
            <p className="truncate font-medium">{fullName(user!)}</p>
            <p className="truncate text-muted-foreground">{user!.email}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={logout}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {maintenance && (
          <div className="bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
            Maintenance mode is ON — the public app is unreachable for non-admins
          </div>
        )}
        <main className="mx-auto max-w-7xl p-4 md:p-8">{children}</main>
        <div className="border-t p-3 md:hidden">
          <Button variant="outline" size="sm" onClick={logout}><LogOut className="size-4" /> Sign out ({user!.email})</Button>
        </div>
      </div>
    </div>
  )
}
