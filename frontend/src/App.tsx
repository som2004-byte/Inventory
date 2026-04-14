import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { Dashboard } from "@/pages/Dashboard";
import { DashboardDetail } from "@/pages/DashboardDetail";
import { InventoryList } from "@/pages/InventoryList";
import { ItemForm } from "@/pages/ItemForm";
import { Analytics } from "@/pages/Analytics";
import { CategoriesAdmin } from "@/pages/CategoriesAdmin";
import { SuppliersPage } from "@/pages/SuppliersPage";
import { SmartOperations } from "@/pages/SmartOperations";

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-600">Loading…</div>;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/details/:metric" element={<DashboardDetail />} />
        <Route path="/inventory" element={<InventoryList />} />
        <Route path="/inventory/new" element={<ItemForm />} />
        <Route path="/inventory/:id/edit" element={<ItemForm />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/smart-ops" element={<SmartOperations />} />
        <Route path="/categories" element={<CategoriesAdmin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
