"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Copy, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/admin/api"
import { fieldError, mutate } from "@/lib/admin/mutate"
import type { AccountType, AdminUser } from "@/lib/admin/types"
import type { AdminApiError } from "@/lib/admin/api"
import { useAdmin } from "./admin-auth"
import { ConfirmDialog, FormDialog, FormField, fullName } from "./common"

type Kind = "edit" | "suspend" | "role" | "reset" | "delete"

/** Row actions for one user: dropdown ("menu") or button strip ("buttons"). Owns its dialogs. */
export function UserActions({ user, variant = "menu", onDeleted }: { user: AdminUser; variant?: "menu" | "buttons"; onDeleted?: () => void }) {
  const router = useRouter()
  const [kind, setKind] = useState<Kind | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const close = (o: boolean) => !o && setKind(null)

  const toggleSuspend = () => (user.isSuspended ? mutate(() => api.post(`/api/admin/users/${user.id}/unsuspend`), "User unsuspended") : setKind("suspend"))
  const suspendLabel = user.isSuspended ? "Unsuspend" : "Suspend"

  return (
    <>
      {variant === "menu" ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${fullName(user)}`}><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push(`/admin/users/${user.id}`)}>View details</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setKind("edit")}>Edit details</DropdownMenuItem>
            <DropdownMenuItem onSelect={toggleSuspend}>{suspendLabel}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setKind("role")}>Change role</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setKind("reset")}>Reset password</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setKind("delete")}>Delete account</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setKind("edit")}>Edit</Button>
          <Button variant="outline" size="sm" onClick={toggleSuspend}>{suspendLabel}</Button>
          <Button variant="outline" size="sm" onClick={() => setKind("role")}>Change role</Button>
          <Button variant="outline" size="sm" onClick={() => setKind("reset")}>Reset password</Button>
          <Button variant="destructive" size="sm" onClick={() => setKind("delete")}>Delete</Button>
        </div>
      )}

      {kind === "edit" && <EditDialog user={user} onOpenChange={close} />}
      {kind === "suspend" && <SuspendDialog user={user} onOpenChange={close} />}
      {kind === "role" && <RoleDialog user={user} onOpenChange={close} />}

      <ConfirmDialog
        open={kind === "reset"}
        onOpenChange={close}
        title={`Reset password for ${fullName(user)}?`}
        description="A temporary password will be generated and shown once."
        confirmLabel="Reset password"
        destructive={false}
        onConfirm={async () => {
          const r = await mutate<{ temporaryPassword: string }>(() => api.post(`/api/admin/users/${user.id}/reset-password`))
          if (r.ok) setTempPassword(r.res.data.temporaryPassword)
          return r.ok
        }}
      />
      <ConfirmDialog
        open={kind === "delete"}
        onOpenChange={close}
        title={`Delete ${fullName(user)}?`}
        description="This permanently deletes the account and cannot be undone."
        onConfirm={async () => {
          const r = await mutate(() => api.del(`/api/admin/users/${user.id}`), "User deleted")
          if (r.ok) onDeleted?.()
          return r.ok
        }}
      />

      <Dialog open={tempPassword !== null} onOpenChange={(o) => !o && setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> This will not be shown again. Share it securely with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input readOnly value={tempPassword ?? ""} className="font-mono" onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(tempPassword ?? ""); toast.success("Copied") }}>
              <Copy className="size-4" /> Copy
            </Button>
          </div>
          <DialogFooter><Button onClick={() => setTempPassword(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SuspendDialog({ user, onOpenChange }: { user: AdminUser; onOpenChange: (o: boolean) => void }) {
  const [reason, setReason] = useState("")
  return (
    <FormDialog open onOpenChange={onOpenChange} title={`Suspend ${fullName(user)}`} description="They will be unable to sign in until unsuspended." submitLabel="Suspend"
      onSubmit={async () => (await mutate(() => api.post(`/api/admin/users/${user.id}/suspend`, reason.trim() ? { reason: reason.trim() } : {}), "User suspended")).ok}>
      <FormField label="Reason (optional)"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. policy violation" /></FormField>
    </FormDialog>
  )
}

function RoleDialog({ user, onOpenChange }: { user: AdminUser; onOpenChange: (o: boolean) => void }) {
  const { user: me } = useAdmin()
  const [role, setRole] = useState<AccountType>(user.accountType)
  const isSelf = me?.id === user.id
  return (
    <FormDialog open onOpenChange={onOpenChange} title={`Change role for ${fullName(user)}`} submitLabel="Update role"
      onSubmit={async () => (await mutate(() => api.patch(`/api/admin/users/${user.id}/role`, { accountType: role }), "Role updated")).ok}>
      <FormField label="Role">
        <Select value={role} onValueChange={(v) => setRole(v as AccountType)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["student", "teacher", "admin"] as AccountType[]).map((r) => (
              <SelectItem key={r} value={r} disabled={isSelf && r !== "admin"} className="capitalize">{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isSelf && <p className="text-xs text-muted-foreground">You cannot remove your own admin access.</p>}
      </FormField>
    </FormDialog>
  )
}

function EditDialog({ user, onOpenChange }: { user: AdminUser; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({ firstName: user.firstName ?? "", lastName: user.lastName ?? "", email: user.email, age: user.age?.toString() ?? "", gender: user.gender ?? "" })
  const [err, setErr] = useState<AdminApiError>()
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <FormDialog open onOpenChange={onOpenChange} title={`Edit ${fullName(user)}`}
      onSubmit={async () => {
        const body: Record<string, unknown> = { firstName: f.firstName, lastName: f.lastName, email: f.email }
        if (f.age !== "") body.age = Number(f.age)
        if (f.gender) body.gender = f.gender
        const r = await mutate(() => api.patch(`/api/admin/users/${user.id}`, body), "User updated")
        if (!r.ok) setErr(r.error)
        return r.ok
      }}>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First name" error={fieldError(err, "firstName")}><Input value={f.firstName} onChange={set("firstName")} /></FormField>
        <FormField label="Last name" error={fieldError(err, "lastName")}><Input value={f.lastName} onChange={set("lastName")} /></FormField>
      </div>
      <FormField label="Email" error={fieldError(err, "email")}><Input type="email" value={f.email} onChange={set("email")} /></FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Age" error={fieldError(err, "age")}><Input type="number" min={1} value={f.age} onChange={set("age")} /></FormField>
        <FormField label="Gender" error={fieldError(err, "gender")}><Input value={f.gender} onChange={set("gender")} /></FormField>
      </div>
    </FormDialog>
  )
}
