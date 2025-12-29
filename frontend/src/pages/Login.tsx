import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
