import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Auth & protection
import LoginPage      from "../pages/auth/LoginPage";
import ProtectedRoute from "../components/ProtectedRoute";

// Layouts
import AdminLayout     from "../layouts/AdminLayout";
import SemiAdminLayout from "../layouts/SemiAdminLayout";
import AgentLayout     from "../layouts/AgentLayout";

// Espace client V2 (SPA avec barre d'icônes)
import ClientLogin           from "../client/pages/Login";
import ClientHome            from "../client/pages/Home";
import ClientSend            from "../client/pages/Send";
import ClientHistory         from "../client/pages/History";
import ClientTransactionView from "../client/pages/TransactionView";
import ClientNotifications   from "../client/pages/Notifications";
import ClientProfile         from "../client/pages/Profile";
import ClientBook            from "../client/pages/Book";

// Espace invité (sans compte) — même coquille SPA que le client
import GuestHome from "../guest/pages/GuestHome";
import { GuestSend, GuestTrack, GuestCalculator, GuestSupport } from "../guest/pages/GuestPages";
import { SessionShell, BySession, ClientOnly } from "./SessionRoutes";

// Pages publiques
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
import AdminAnnouncements from "../pages/admin/Announcements";

// Pages Semi-Admin
import SemiAdminDashboard from "../pages/semi-admin/Dashboard";
import SemiAdminTransactions from "../pages/semi-admin/Transactions";

// Pages Agent
import AgentDashboard from "../pages/agent/Dashboard";
import AgentTransaction from "../pages/agent/Transactions";
import AgentRedirection from "../pages/agent/Redirections";
import AgentNumbers from "../pages/agent/Numbers";
import AgentCreate from "../pages/agent/Creation";

// Paramètres communs au personnel (notifications)
import StaffSettings from "../pages/staff/NotificationSettings";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ──────── PUBLIC (plein écran) ──────── */}
        <Route path="/connexion"                element={<ClientLogin />} />

        {/* ──────── SPA client / invité : mêmes adresses, coquille selon la session ──────── */}
        <Route path="/" element={<SessionShell />}>
          <Route index                  element={<BySession client={<ClientHome />} guest={<GuestHome />} />} />
          <Route path="envoyer"         element={<BySession client={<ClientSend />} guest={<GuestSend />} />} />
          <Route path="suivi"           element={<BySession client={<Navigate to="/transactions" replace />} guest={<GuestTrack />} />} />
          <Route path="calculatrice"    element={<GuestCalculator />} />
          <Route path="aide"            element={<GuestSupport />} />
          <Route path="transaction/:encryptedId" element={<TransactionDetail />} />

          {/* Réservé aux clients connectés */}
          <Route path="transactions"      element={<ClientOnly><ClientHistory /></ClientOnly>} />
          <Route path="transactions/:ref" element={<ClientOnly><ClientTransactionView /></ClientOnly>} />
          <Route path="notifications"     element={<ClientOnly><ClientNotifications /></ClientOnly>} />
          <Route path="profil"            element={<ClientOnly><ClientProfile /></ClientOnly>} />
          <Route path="profil/numeros"    element={<ClientOnly><ClientBook /></ClientOnly>} />
        </Route>
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
          <Route path="annonces" element={<AdminAnnouncements />} />
          <Route path="parametres" element={<StaffSettings />} />
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
          <Route path="parametres" element={<StaffSettings />} />
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
          <Route path="redirections" element={<AgentRedirection />} />
          <Route path="create" element={<AgentCreate />} />
          <Route path="numbers" element={<AgentNumbers />} />
          <Route path="parametres" element={<StaffSettings />} />
        </Route>

        {/* ──────── FALLBACK ──────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}