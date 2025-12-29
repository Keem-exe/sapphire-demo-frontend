import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      // Optional redirect:
      // window.location.href = "/select-level";
    } catch (err) {
      setError("Invalid email or password. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-border bg-card shadow-soft rounded-2xl">
      <CardHeader className="space-y-4 text-center pb-8">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent">
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
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
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
            <Button
              type="button"
              variant="ghost"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              asChild
            >
              <Link to="/dashboard/signup">
                Don&apos;t have an account? Sign Up!
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
