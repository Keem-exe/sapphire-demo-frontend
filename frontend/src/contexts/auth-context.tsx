import React, { createContext, useContext, useState } from "react";
import { api } from "@/lib/api";

type AuthContextType = {
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem("access_token")
  );

  async function login(email: string, password: string) {
    const response = await api<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem("access_token", response.access_token);
    setAccessToken(response.access_token);
  }

  function logout() {
    localStorage.removeItem("access_token");
    setAccessToken(null);
  }

  return (
    <AuthContext.Provider value={{ accessToken, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
