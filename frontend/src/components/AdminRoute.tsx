import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
