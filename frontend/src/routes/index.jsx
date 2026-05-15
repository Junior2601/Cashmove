import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages publiques
import HomePage from "../pages/publics/HomePage";
import TransactionDetail from "../pages/publics/TransactionDetail";

// Dashboards
import AdminDashboard from "../pages/admin/Dashboard";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<HomePage />} />
        <Route path="/transaction/:encryptedId" element={<TransactionDetail />} />

        {/* ADMIN */}
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}