// src/pages/agent/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  RefreshCw,
  Eye,
  ShieldAlert,
  User,
  Coins,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
const fmt = (n, decimals = 2) => parseFloat(n || 0).toFixed(decimals);

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-600 text-sm font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// Badge solde par devise  →  données : { currency_code, currency_symbol, amount }
const BalanceBadge = ({ amount, code, symbol }) => {
  if (parseFloat(amount || 0) === 0) return null;
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 text-xs font-medium hover:bg-sky-200 transition-colors duration-150">
      <span>{code}</span>
      <span className="text-sky-600">
        {symbol}
        {fmt(amount)}
      </span>
    </div>
  );
};

// Badge commission du mois  →  données : { code, symbol, total_gain, transaction_count }
const CommissionBadge = ({ total_gain, code, symbol, transaction_count }) => {
  if (parseFloat(total_gain || 0) === 0) return null;
  return (
    <div className="flex items-center justify-between p-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
      <div className="flex items-center gap-2">
        <div className="p-1 bg-green-100 rounded">
          <Coins className="w-3 h-3 text-green-600" />
        </div>
        <span className="font-medium text-green-800 text-sm">{code}</span>
        <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
          {transaction_count} trans.
        </span>
      </div>
      <span className="font-bold text-green-700 text-sm">
        +{symbol}
        {fmt(total_gain)}
      </span>
    </div>
  );
};

// Item liste de transactions  →  données : v_transaction_details
const TransactionItem = ({ transaction }) => (
  <div className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors duration-200">
    <div className="flex items-center gap-3">
      <div
        className={`p-2 rounded-lg ${
          transaction.status === "effectuee"
            ? "bg-green-100 text-green-600"
            : transaction.status === "en_attente" || transaction.status === "validee"
            ? "bg-yellow-100 text-yellow-600"
            : "bg-red-100 text-red-600"
        }`}
      >
        {transaction.status === "effectuee" ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : transaction.status === "en_attente" || transaction.status === "validee" ? (
          <Clock className="w-4 h-4" />
        ) : (
          <AlertCircle className="w-4 h-4" />
        )}
      </div>
      <div>
        <p className="font-medium text-slate-800 text-sm">
          #{transaction.tracking_code || `TRX${transaction.id}`}
        </p>
        <p className="text-xs text-slate-500">
          {new Date(transaction.created_at).toLocaleDateString("fr-FR")}
        </p>
      </div>
    </div>
    <div className="text-right">
      <p className="font-semibold text-slate-800">
        {fmt(transaction.send_amount)} {transaction.from_currency_symbol || "€"}
      </p>
      <span
        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
          transaction.status === "effectuee"
            ? "bg-green-100 text-green-800"
            : transaction.status === "en_attente" || transaction.status === "validee"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800"
        }`}
      >
        {transaction.status === "effectuee"
          ? "Effectuée"
          : transaction.status === "validee"
          ? "Validée"
          : transaction.status === "en_attente"
          ? "En attente"
          : transaction.status === "expiree"
          ? "Expirée"
          : "Annulée"}
      </span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────
export default function AgentDashboard() {
  const navigate = useNavigate();

  // État brut issu des 3 appels API
  const [stats, setStats] = useState(null);           // GET /transactions/my-stats
  const [transactions, setTransactions] = useState([]); // GET /transactions/my-transactions
  const [balances, setBalances] = useState([]);         // GET /balances/agent/:id
  const [gains, setGains] = useState(null);             // GET /gains/agent/:id/current-month

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const agentInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const agentId = agentInfo.id;

  const fetchAll = useCallback(async () => {
    if (!agentId) {
      setError("Identifiant agent introuvable. Veuillez vous reconnecter.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Appels parallèles pour minimiser la latence
      const [statsRes, txRes, balanceRes, gainRes] = await Promise.all([
        // 1. Stats agrégées de l'agent (validated, completed, cancelled, volumes)
        api.get("/transactions/my-stats"),

        // 2. Transactions récentes — pas de params pour éviter le bug SQL côté backend
        // (le controller utilise limit=5 par défaut)
        api.get("/transactions/my-transactions"),

        // 3. Soldes par devise de l'agent
        api.get(`/balances/agent/${agentId}`),

        // 4. Gains/commissions du mois en cours par devise
        api.get(`/gains/agent/${agentId}/current-month`),
      ]);

      setStats(statsRes.data.data);
      setTransactions(txRes.data.data || []);
      setBalances(balanceRes.data.data || []);
      setGains(gainRes.data.data || null);
    } catch (err) {
      console.error("❌ Erreur dashboard agent:", err);
      const status = err.response?.status;
      if (status === 403) setError("Accès refusé. Vérifiez que vous êtes connecté en tant qu'agent.");
      else if (status === 401) setError("Session expirée. Veuillez vous reconnecter.");
      else setError("Erreur lors du chargement : " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Données dérivées ──────────────────────────────────
  // Soldes non nuls (champ `amount` dans balance.model → colonne `amount`)
  const nonZeroBalances = balances.filter((b) => parseFloat(b.amount || 0) > 0);

  // Commissions non nulles du mois
  const nonZeroCommissions = (gains?.by_currency || []).filter(
    (g) => parseFloat(g.total_gain || 0) > 0
  );

  // Taux de réussite
  const totalTx =
    (stats?.completed_count || 0) +
    (stats?.validated_count || 0) +
    (stats?.cancelled_count || 0);
  const successRate = totalTx > 0 ? Math.round((stats.completed_count / totalTx) * 100) : 0;

  // ── Rendu : états spéciaux ────────────────────────────
  if (error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Erreur d'accès</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/login")}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Se connecter
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
            >
              Effacer la session
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // ── Rendu principal ───────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
              Tableau de Bord Agent
            </h1>
            <p className="text-slate-600">
              Connecté en tant que{" "}
              <span className="font-semibold">{agentInfo.name || "Agent"}</span>
            </p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Actualisation..." : "Actualiser"}
        </button>
      </div>

      {/* ── Cartes statistiques ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Carte solde avec badges par devise */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 group md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-slate-600 text-sm font-medium mb-1">Soldes</p>
              {/* Pas de solde global cross-devise : on liste les devises */}
              <p className="text-2xl font-bold text-slate-800">
                {nonZeroBalances.length > 0
                  ? `${nonZeroBalances.length} devise${nonZeroBalances.length > 1 ? "s" : ""}`
                  : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Montants disponibles</p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 group-hover:scale-110 transition-transform duration-300">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>

          {nonZeroBalances.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
                Solde par devise
              </p>
              <div className="flex flex-wrap gap-1.5">
                {nonZeroBalances.map((b, i) => (
                  <BalanceBadge
                    key={i}
                    amount={b.amount}
                    code={b.currency_code}
                    symbol={b.currency_symbol}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* En attente = validee (client a validé, agent doit traiter) */}
        <StatCard
          title="En Attente"
          value={stats?.validated_count ?? 0}
          icon={Clock}
          color="bg-gradient-to-br from-yellow-500 to-yellow-600"
          subtitle="À traiter"
        />

        {/* Effectuées */}
        <StatCard
          title="Effectuées"
          value={stats?.completed_count ?? 0}
          icon={CheckCircle2}
          color="bg-gradient-to-br from-green-500 to-green-600"
          subtitle="Transactions terminées"
        />

        {/* Annulées */}
        <StatCard
          title="Annulées"
          value={stats?.cancelled_count ?? 0}
          icon={AlertCircle}
          color="bg-gradient-to-br from-red-500 to-red-600"
          subtitle="Transactions annulées"
        />
      </div>

      {/* ── Section gains + transactions récentes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance globale */}
        <div className="lg:col-span-1 bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800">Performance globale</h3>
          </div>
          <div className="space-y-4">
            {/* Volume total envoyé (transactions effectuées) */}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Volume envoyé</span>
              <span className="font-semibold text-blue-600">
                {fmt(stats?.total_send_amount)} €
              </span>
            </div>

            {/* Volume total reçu */}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Volume reçu</span>
              <span className="font-semibold text-slate-700">
                {fmt(stats?.total_receive_amount)} €
              </span>
            </div>

            {/* Commissions du mois toutes devises */}
            <div className="flex justify-between items-center">
              <span className="text-slate-600 text-sm">Gains ce mois</span>
              <span className="font-semibold text-emerald-600">
                +{fmt(gains?.total_all_currencies)} €
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 text-sm">Taux de réussite</span>
                <span className="font-semibold text-blue-600">{successRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commissions du mois par devise */}
        {nonZeroCommissions.length > 0 && (
          <div className="lg:col-span-1 bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-slate-800">Gains du mois</h3>
            </div>
            <div className="space-y-3">
              {nonZeroCommissions.map((g, i) => (
                <CommissionBadge
                  key={i}
                  total_gain={g.total_gain}
                  code={g.code}
                  symbol={g.symbol}
                  transaction_count={g.transaction_count}
                />
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Total gains</span>
                <span className="font-bold text-green-600">
                  +{fmt(gains?.total_all_currencies)} €
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Transactions récentes */}
        <div
          className={`bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm ${
            nonZeroCommissions.length > 0 ? "lg:col-span-1" : "lg:col-span-2"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-slate-800">Transactions récentes</h3>
            </div>
            <Link
              to="/agent/transactions"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              Voir tout
            </Link>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {transactions.length > 0 ? (
              transactions.map((tx) => <TransactionItem key={tx.id} transaction={tx} />)
            ) : (
              <div className="text-center py-8 text-slate-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucune transaction récente</p>
                <p className="text-sm text-slate-400 mt-1">Vos transactions apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Actions rapides ── */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Actions Rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/agent/transactions"
            className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 group"
          >
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Gérer Transactions</p>
              <p className="text-sm text-slate-600">Voir et valider</p>
            </div>
          </Link>

          <Link
            to="/agent/balances"
            className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-green-300 hover:bg-green-50/50 transition-all duration-200 group"
          >
            <div className="p-2 rounded-lg bg-green-100 text-green-600 group-hover:bg-green-200 transition-colors">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Mes Fonds</p>
              <p className="text-sm text-slate-600">Consulter le solde</p>
            </div>
          </Link>

          <Link
            to="/agent/history"
            className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-200 group"
          >
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-slate-800">Historique</p>
              <p className="text-sm text-slate-600">Toutes les activités</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}