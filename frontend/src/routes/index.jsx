import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth & protection
import LoginPage      from "../pages/auth/LoginPage";
import ProtectedRoute from "../components/ProtectedRoute";

// Layouts
import AdminLayout     from "../layouts/AdminLayout";
import SemiAdminLayout from "../layouts/SemiAdminLayout";
import AgentLayout     from "../layouts/AgentLayout";

// Pages publiques
import HomePage          from "../pages/publics/HomePage";
import TransactionDetail from "../pages/publics/TransactionDetail";
import Unauthorized      from "../pages/publics/Unauthorized";

// Pages Admin
import AdminDashboard from "../pages/admin/Dashboard";
import AdminAgents  from "../pages/admin/Agents";
import AdminSemiAdmins  from "../pages/admin/SemiAdmins";
import AdminCountries  from "../pages/admin/Countries";

// Pages Semi-Admin
import SemiAdminDashboard from "../pages/semi-admin/Dashboard";

// Pages Agent
import AgentDashboard from "../pages/agent/Dashboard";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ──────── PUBLIC ──────── */}
        <Route path="/"                         element={<HomePage />} />
        <Route path="/transaction/:encryptedId" element={<TransactionDetail />} />
        <Route path="/login"                    element={<LoginPage />} />
        <Route path="/unauthorized"             element={<Unauthorized />} />

        {/* ──────── ADMIN ──────── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="agents"      element={<AdminAgents />} />
          <Route path="semi-admins" element={<AdminSemiAdmins />} />
          <Route path="countries" element={<AdminCountries />} />
        </Route>

        {/* ──────── SEMI-ADMIN ──────── */}
        <Route
          path="/semi-admin"
          element={
            <ProtectedRoute roles={["semi-admin"]}>
              <SemiAdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SemiAdminDashboard />} />
        </Route>

        {/* ──────── AGENT ──────── */}
        <Route
          path="/agent"
          element={
            <ProtectedRoute roles={["agent"]}>
              <AgentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AgentDashboard />} />
        </Route>

        {/* ──────── FALLBACK ──────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}