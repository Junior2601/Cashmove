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
import AdminCurrencies  from "../pages/admin/Currencies";
import AdminRates  from "../pages/admin/Rates";
import AdminBalances  from "../pages/admin/Balances";
import AdminProfits  from "../pages/admin/Profits";
import AdminGains  from "../pages/admin/Gains";
import AdminPayements  from "../pages/admin/Payements";
import AdminNumbers  from "../pages/admin/Numbers";
import AdminTransactions  from "../pages/admin/Transactions";
import AdminHistories  from "../pages/admin/Histories";

// Pages Semi-Admin
import SemiAdminDashboard from "../pages/semi-admin/Dashboard";
import SemiAdminTransactions from "../pages/semi-admin/Transactions";

// Pages Agent
import AgentDashboard from "../pages/agent/Dashboard";
import AgentTransaction from "../pages/agent/Transactions";

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
          <Route path="currencies" element={<AdminCurrencies />} />
          <Route path="rates" element={<AdminRates />} />
          <Route path="balances" element={<AdminBalances />} />
          <Route path="profits" element={<AdminProfits />} />
          <Route path="gains" element={<AdminGains />} />
          <Route path="payements" element={<AdminPayements />} />
          <Route path="numbers" element={<AdminNumbers />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="historiques" element={<AdminHistories />} />
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
          <Route path="transactions" element={<SemiAdminTransactions />} />
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
          <Route path="transactions" element={<AgentTransaction />} />
        </Route>

        {/* ──────── FALLBACK ──────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}