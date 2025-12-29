import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/Login";
import { AuthProvider } from "@/contexts/auth-context";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
