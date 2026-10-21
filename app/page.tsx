import { AuthShell } from "@/components/auth-shell"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <AuthShell tagline="Pick up where you left off. Sapphy is ready and waiting on you.">
      <LoginForm />
    </AuthShell>
  )
}
