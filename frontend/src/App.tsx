import type { ReactNode } from "react";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

type RequireAuthProps = {
  children: ReactNode;
};

function RequireAuth({ children }: RequireAuthProps) {
  const authed = localStorage.getItem("mock_auth") === "1";
  return authed ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
