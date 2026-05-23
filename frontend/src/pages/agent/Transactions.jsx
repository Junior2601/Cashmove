import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Download,
  FileText,
  MapPin,
  User,
  Calendar,
  CreditCard,
  ArrowRight,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  DollarSign,
  Hash,
  X,
  CheckCheck,
  Ban,
  Loader2,
  Share2,
  Copy,
  LockIcon,
  ShieldOff,
} from "lucide-react";

// ─── Modal de confirmation ───────────────────────────────────────────────────
function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel, confirmColor, loading,
  reasonRequired, reason, setReason,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle
            size={22}
            className={
              confirmColor === "red"
                ? "text-red-500 flex-shrink-0 mt-0.5"
                : "text-green-500 flex-shrink-0 mt-0.5"
            }
          />
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{message}</p>
          </div>
        </div>

        {reasonRequired && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Raison <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex : Demande du client, fonds insuffisants..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || (reasonRequired && !reason.trim())}
            className={`px-4 py-2 text-sm text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${confirmColor === "red"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
              }`}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de détail ─────────────────────────────────────────────────────────
function TransactionDetailModal({
  transaction, onClose, onFinalize, onCancel, actionLoading, canProcess,
}) {
  if (!transaction) return null;

  const canFinalize = transaction.status === "validee";
  const canCancel   = transaction.status === "en_attente" || transaction.status === "validee";

  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={15} className="text-indigo-600 flex-shrink-0" />
            <span className="font-mono text-indigo-600 font-semibold text-sm truncate">
              {transaction.tracking_code}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0 ml-2"
          >
            <X size={14} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Avertissement si l'agent ne peut pas traiter */}
          {!canProcess && canFinalize && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-2 rounded-lg text-xs">
              <ShieldOff size={14} className="flex-shrink-0 mt-0.5" />
              <span>Vous n'avez pas l'autorisation de traiter des transactions. Contactez un administrateur.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="De" value={transaction.from_country} />
            <InfoItem label="Vers" value={transaction.to_country} />
            <InfoItem
              label="Montant envoyé"
              value={`${fmt(transaction.send_amount)} ${transaction.from_currency_code || ""}`}
            />
            <InfoItem
              label="Montant reçu"
              value={`${fmt(transaction.receive_amount)} ${transaction.to_currency_code || ""}`}
            />
            <InfoItem label="Méthode envoi" value={transaction.sender_method} />
            <InfoItem label="Méthode réception" value={transaction.receiver_method} />
            <InfoItem label="Tél. expéditeur" value={transaction.sender_phone} />
            {/* Destinataire avec copie */}
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Tél. destinataire</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium text-gray-800">
                  {transaction.receiver_phone || "—"}
                </p>
                {transaction.receiver_phone && (
                  <button
                    onClick={() => copyToClipboard(transaction.receiver_phone)}
                    className="p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    title="Copier le numéro"
                  >
                    {copied
                      ? <CheckCircle size={14} className="text-green-500" />
                      : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
            <InfoItem label="Numéro autorisé" value={transaction.authorized_number} />
            <InfoItem
              label="Statut"
              value={translateStatus(transaction.status)}
              colored
              status={transaction.status}
            />
            <InfoItem label="Créée le" value={fmtDate(transaction.created_at)} />
          </div>
        </div>

        {/* Actions */}
        {(canFinalize || canCancel) && (
          <div className="flex justify-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
            {canCancel && (
              <button
                onClick={() => onCancel(transaction)}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 bg-white rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {actionLoading === "cancel"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Ban size={12} />}
                Annuler
              </button>
            )}
            {canFinalize && (
              <button
                onClick={() => canProcess && onFinalize(transaction)}
                disabled={actionLoading !== null || !canProcess}
                title={!canProcess ? "Vous n'êtes pas autorisé à traiter des transactions" : "Effectuer la transaction"}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors
                  ${canProcess
                    ? "bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    : "bg-green-600 opacity-30 cursor-not-allowed"
                  }`}
              >
                {actionLoading === "finalize"
                  ? <Loader2 size={12} className="animate-spin" />
                  : <CheckCheck size={12} />}
                Effectuer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Redirection reçue (accepter / refuser) ────────────────────────────
function RedirectionActionModal({
  open, onClose, onAccept, onReject, redirection, loading,
}) {
  if (!open || !redirection) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100">
        <div className="flex items-start gap-3 mb-4">
          <Share2 size={22} className="text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Redirection reçue</h3>
            <p className="text-sm text-gray-500 mt-1">
              Transaction <span className="font-mono font-medium text-indigo-600">{redirection.tracking_code}</span>
            </p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5 mb-5">
          <div className="flex justify-between">
            <span className="text-gray-500">Raison</span>
            <span className="font-medium text-gray-800">{redirection.reason || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Montant reçu</span>
            <span className="font-semibold text-gray-900">{fmt(redirection.receive_amount)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Plus tard
          </button>
          <button
            onClick={() => onReject(redirection.redirection_id)}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading === "reject" && <Loader2 size={14} className="animate-spin" />}
            <Ban size={14} />
            Refuser
          </button>
          <button
            onClick={() => onAccept(redirection.redirection_id)}
            disabled={loading}
            className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading === "accept" && <Loader2 size={14} className="animate-spin" />}
            <CheckCheck size={14} />
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InfoItem({ label, value, colored, status }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {colored ? (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}
        >
          {value}
        </span>
      ) : (
        <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
      )}
    </div>
  );
}

const fmt = (amount) => {
  if (!amount || isNaN(amount)) return "0.00";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const fmtDate = (d) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtDateShort = (d) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
  });
};

function translateStatus(status) {
  const map = {
    en_attente: "En attente",
    validee: "Validée",
    effectuee: "Effectuée",
    annulee: "Annulée",
    expiree: "Expirée",
    echouee: "Échouée",
    pending: "En attente",
    completed: "Complétée",
    validated: "Validée",
    cancelled: "Annulée",
  };
  return map[status] || status || "Inconnu";
}

function getStatusColor(status) {
  switch (status) {
    case "effectuee": case "completed": case "validated": case "validee":
      return "bg-green-100 text-green-800 border-green-200";
    case "en_attente": case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "annulee": case "cancelled": case "echouee": case "expiree":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusIcon(status) {
  switch (status) {
    case "effectuee": case "completed": case "validated": case "validee":
      return <CheckCircle size={14} className="text-green-600" />;
    case "en_attente": case "pending":
      return <Clock size={14} className="text-yellow-600" />;
    case "annulee": case "cancelled": case "echouee": case "expiree":
      return <XCircle size={14} className="text-red-600" />;
    default:
      return <AlertCircle size={14} className="text-gray-600" />;
  }
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function AgentTransactions() {
  const [transactions, setTransactions]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError]     = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // can_process de l'agent connecté (récupéré via /agents/me/profile)
  const [canProcess, setCanProcess] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1, pages: 1, total: 0, limit: 10,
  });

  const [filters, setFilters] = useState({ status: "", from_date: "", to_date: "" });
  const [showFilters, setShowFilters]             = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Modales
  const [finalizeModal, setFinalizeModal] = useState({ open: false, transaction: null });
  const [cancelModal, setCancelModal]     = useState({ open: false, transaction: null });
  const [cancelReason, setCancelReason]   = useState("");

  // Redirection reçue
  const [redirectionModal, setRedirectionModal]     = useState({ open: false, redirection: null });
  const [redirectionLoading, setRedirectionLoading] = useState(null);

  // ── Charger le profil de l'agent (pour can_process) ─────────────────────
  const fetchAgentProfile = useCallback(async () => {
    try {
      const res = await api.get("/agents/me/profile");
      if (res.data?.success) {
        setCanProcess(res.data.data?.can_process ?? false);
      }
    } catch (err) {
      console.error("Erreur chargement profil agent:", err);
    }
  }, []);

  // ── Charger les transactions de l'agent ──────────────────────────────────
  const fetchTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: pagination.limit };
      if (filters.status)    params.status    = filters.status;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date)   params.to_date   = filters.to_date;

      const res = await api.get("/transactions/my-transactions", { params });

      if (res.data?.success) {
        setTransactions(res.data.data || []);
        const pg = res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
        setPagination({
          page: pg.page,
          limit: pg.limit,
          total: pg.total,
          pages: pg.totalPages,
        });
      } else {
        setTransactions([]);
        setPagination({ page: 1, pages: 1, total: 0, limit: 10 });
      }
    } catch (err) {
      if (err.response?.status === 401) setError("Token invalide ou expiré.");
      else if (err.response?.status === 403) setError("Accès non autorisé.");
      else setError("Erreur lors de la récupération des transactions.");
      setTransactions([]);
      setPagination({ page: 1, pages: 1, total: 0, limit: 10 });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit]);

  useEffect(() => {
    fetchAgentProfile();
  }, [fetchAgentProfile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchTransactions(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, pagination.limit, fetchTransactions]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleFinalizeConfirm = async () => {
    const tx = finalizeModal.transaction;
    if (!tx || !canProcess) return;
    setActionLoading("finalize");
    setActionError(null);
    try {
      await api.put(`/transactions/process/${tx.id}`, {});
      setActionSuccess("Transaction effectuée avec succès !");
      setFinalizeModal({ open: false, transaction: null });
      setSelectedTransaction(null);
      fetchTransactions(pagination.page);
    } catch (err) {
      setActionError(err.response?.data?.message || "Erreur lors de la finalisation.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelConfirm = async () => {
    const tx = cancelModal.transaction;
    if (!tx || !cancelReason.trim()) return;
    setActionLoading("cancel");
    setActionError(null);
    try {
      await api.put(`/transactions/cancel/${tx.id}`, { reason: cancelReason });
      setActionSuccess("Transaction annulée avec succès.");
      setCancelModal({ open: false, transaction: null });
      setCancelReason("");
      setSelectedTransaction(null);
      fetchTransactions(pagination.page);
    } catch (err) {
      setActionError(err.response?.data?.message || "Erreur lors de l'annulation.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRedirection = async (redirection_id) => {
    setRedirectionLoading("accept");
    try {
      await api.put(`/redirections/${redirection_id}/accept`);
      setActionSuccess("Redirection acceptée avec succès.");
      setRedirectionModal({ open: false, redirection: null });
      fetchTransactions(pagination.page);
    } catch (err) {
      setActionError(err.response?.data?.message || "Erreur lors de l'acceptation.");
    } finally {
      setRedirectionLoading(null);
    }
  };

  const handleRejectRedirection = async (redirection_id) => {
    setRedirectionLoading("reject");
    try {
      await api.put(`/redirections/${redirection_id}/reject`);
      setActionSuccess("Redirection refusée.");
      setRedirectionModal({ open: false, redirection: null });
      fetchTransactions(pagination.page);
    } catch (err) {
      setActionError(err.response?.data?.message || "Erreur lors du refus.");
    } finally {
      setRedirectionLoading(null);
    }
  };

  const openFinalize = (tx) => {
    setActionError(null);
    setFinalizeModal({ open: true, transaction: tx });
  };

  const openCancel = (tx) => {
    setActionError(null);
    setCancelReason("");
    setCancelModal({ open: true, transaction: tx });
  };

  // ── Filtres ───────────────────────────────────────────────────────────────
  const handleFilterChange = (key, value) =>
    setFilters((p) => ({ ...p, [key]: value }));
  const clearFilter = (key) => setFilters((p) => ({ ...p, [key]: "" }));
  const resetFilters = () =>
    setFilters({ status: "", from_date: "", to_date: "" });

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const activeFilters    = Object.entries(filters)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => ({ key: k, value: v }));

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) fetchTransactions(newPage);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-gray-50 min-h-screen">

      {/* ── Modales ── */}
      <ConfirmModal
        open={finalizeModal.open}
        onClose={() => setFinalizeModal({ open: false, transaction: null })}
        onConfirm={handleFinalizeConfirm}
        title="Confirmer la finalisation"
        message={`Voulez-vous marquer la transaction ${finalizeModal.transaction?.tracking_code} comme effectuée ? Cette action est irréversible.`}
        confirmLabel="Oui, effectuer"
        confirmColor="green"
        loading={actionLoading === "finalize"}
      />

      <ConfirmModal
        open={cancelModal.open}
        onClose={() => {
          setCancelModal({ open: false, transaction: null });
          setCancelReason("");
        }}
        onConfirm={handleCancelConfirm}
        title="Confirmer l'annulation"
        message={`Annuler la transaction ${cancelModal.transaction?.tracking_code} ?`}
        confirmLabel="Oui, annuler"
        confirmColor="red"
        loading={actionLoading === "cancel"}
        reasonRequired
        reason={cancelReason}
        setReason={setCancelReason}
      />

      <RedirectionActionModal
        open={redirectionModal.open}
        onClose={() => setRedirectionModal({ open: false, redirection: null })}
        onAccept={handleAcceptRedirection}
        onReject={handleRejectRedirection}
        redirection={redirectionModal.redirection}
        loading={redirectionLoading}
      />

      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onFinalize={(tx) => { setSelectedTransaction(null); openFinalize(tx); }}
        onCancel={(tx) => { setSelectedTransaction(null); openCancel(tx); }}
        actionLoading={actionLoading}
        canProcess={canProcess}
      />

      {/* ── Toasts ── */}
      {actionSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm animate-pulse">
          <CheckCircle size={16} />
          {actionSuccess}
          <button onClick={() => setActionSuccess(null)} className="ml-2">
            <X size={14} />
          </button>
        </div>
      )}
      {actionError && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm">
          <AlertCircle size={16} />
          {actionError}
          <button onClick={() => setActionError(null)} className="ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── En-tête ── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2 truncate">
              <FileText size={20} className="text-indigo-600 flex-shrink-0" />
              <span className="truncate">Mes Transactions</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs sm:text-sm text-gray-600">
                Consultez et gérez vos transactions assignées
              </p>
              {/* Badge can_process */}
              {canProcess ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                  <CheckCircle size={10} />
                  Peut traiter
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                  <ShieldOff size={10} />
                  Traitement désactivé
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              <Filter size={14} />
              <span className="hidden xs:inline">Filtres</span>
              {hasActiveFilters && (
                <span className="bg-indigo-600 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
                  {activeFilters.length}
                </span>
              )}
            </button>
            <button
              onClick={() => fetchTransactions(pagination.page)}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden xs:inline">
                {loading ? "Chargement..." : "Actualiser"}
              </span>
            </button>
          </div>
        </div>

        {/* Panneau filtres */}
        {showFilters && (
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Statut */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="effectuee">Effectuée</option>
                  <option value="validee">Validée</option>
                  <option value="en_attente">En attente</option>
                  <option value="annulee">Annulée</option>
                  <option value="expiree">Expirée</option>
                </select>
              </div>

              {/* Date début */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Date début</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={filters.from_date}
                    onChange={(e) => handleFilterChange("from_date", e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                  {filters.from_date && (
                    <button
                      onClick={() => clearFilter("from_date")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Date fin */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Date fin</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={filters.to_date}
                    onChange={(e) => handleFilterChange("to_date", e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                  {filters.to_date && (
                    <button
                      onClick={() => clearFilter("to_date")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={resetFilters}
                className="text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded transition-colors"
              >
                Tout réinitialiser
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="text-xs bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Filtres actifs */}
        {hasActiveFilters && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm flex flex-wrap items-center gap-2">
            <Filter size={13} />
            <span className="font-medium">{activeFilters.length} filtre(s) actif(s)</span>
            {activeFilters.map(({ key, value }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs"
              >
                {value}
                <button onClick={() => clearFilter(key)}>
                  <X size={11} />
                </button>
              </span>
            ))}
            <button onClick={resetFilters} className="text-xs underline ml-1">
              Tout effacer
            </button>
          </div>
        )}
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Compteur ── */}
      {!loading && !error && pagination.total > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg mb-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <FileText size={14} />
            <span className="font-medium">{pagination.total} transaction(s)</span>
          </div>
          <span className="text-xs">
            Page {pagination.page} / {pagination.pages}
          </span>
        </div>
      )}

      {/* ── États ── */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Chargement des transactions…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchTransactions(1)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Réessayer
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Search size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {hasActiveFilters
              ? "Aucune transaction ne correspond à vos critères"
              : "Aucune transaction assignée"}
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-3 text-indigo-600 text-sm"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── TABLEAU desktop ── */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pays
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((t) => {
                    const canFinalize = t.status === "validee";
                    const canCancel   =
                      t.status === "en_attente" || t.status === "validee";
                    const isRedirected = !!t.redirection_id && t.redirection_status === "pending";

                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Hash size={13} className="text-gray-400" />
                            <span className="font-mono text-blue-600 font-medium text-sm">
                              {t.tracking_code || "N/A"}
                            </span>
                            {isRedirected && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 border border-indigo-200">
                                <Share2 size={9} />
                                Redir.
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-gray-600 truncate max-w-[70px]">
                              {t.from_country || "N/A"}
                            </span>
                            <ArrowRight size={11} className="text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-gray-900 truncate max-w-[70px]">
                              {t.to_country || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-semibold text-gray-900 text-sm">
                            <DollarSign size={12} className="text-green-600" />
                            {fmt(t.send_amount)} {t.from_currency_code || ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(t.status)}`}
                          >
                            {getStatusIcon(t.status)}
                            {translateStatus(t.status)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-400" />
                            {fmtDateShort(t.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center justify-start gap-1">
                            {/* Détail */}
                            <button
                              title="Voir les détails"
                              onClick={() => setSelectedTransaction(t)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Redirection en attente : accepter/refuser */}
                            {isRedirected && (
                              <button
                                title="Gérer la redirection reçue"
                                onClick={() =>
                                  setRedirectionModal({ open: true, redirection: { ...t, redirection_id: t.redirection_id } })
                                }
                                className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 transition-colors"
                              >
                                <Share2 size={15} />
                              </button>
                            )}

                            {/* Effectuer — opacité réduite si can_process = false */}
                            {canFinalize && (
                              <button
                                title={
                                  !canProcess
                                    ? "Vous n'êtes pas autorisé à traiter des transactions"
                                    : "Effectuer la transaction"
                                }
                                onClick={() => canProcess && openFinalize(t)}
                                disabled={actionLoading !== null}
                                className={`p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors
                                  ${!canProcess ? "opacity-30 cursor-not-allowed" : "disabled:opacity-40"}`}
                              >
                                <CheckCheck size={15} />
                              </button>
                            )}

                            {/* Annuler */}
                            {canCancel && (
                              <button
                                title="Annuler la transaction"
                                onClick={() => openCancel(t)}
                                disabled={actionLoading !== null}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                              >
                                <Ban size={15} />
                              </button>
                            )}

                            {/* Télécharger */}
                            <button
                              title="Télécharger"
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                              <Download size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CARTES mobile ── */}
          <div className="md:hidden space-y-3">
            {transactions.map((t) => {
              const canFinalize = t.status === "validee";
              const canCancel   = t.status === "en_attente" || t.status === "validee";
              const isRedirected = !!t.redirection_id && t.redirection_status === "pending";

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl shadow-sm p-3 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Hash size={13} className="text-blue-600 flex-shrink-0" />
                      <span className="font-mono text-blue-600 font-medium text-sm truncate">
                        {t.tracking_code || "N/A"}
                      </span>
                      {isRedirected && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 flex-shrink-0">
                          <Share2 size={9} />
                        </span>
                      )}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(t.status)} flex-shrink-0 ml-2`}
                    >
                      {getStatusIcon(t.status)}
                      {translateStatus(t.status)}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600 text-xs">{t.from_country || "N/A"}</span>
                      <ArrowRight size={10} className="text-gray-400" />
                      <span className="font-medium text-gray-900 text-xs">{t.to_country || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={11} className="text-green-600 flex-shrink-0" />
                      <span className="font-semibold text-gray-900 text-sm">
                        {fmt(t.send_amount)} {t.from_currency_code || ""}
                      </span>
                      {t.receive_amount && (
                        <span className="text-xs text-gray-500">
                          → {fmt(t.receive_amount)} {t.to_currency_code || ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard size={11} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        {t.sender_method || "N/A"}
                      </span>
                      <ArrowRight size={8} className="text-gray-400" />
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                        {t.receiver_method || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-end">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-500">{fmtDateShort(t.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Boutons mobile */}
                  <div className="flex flex-wrap justify-center items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setSelectedTransaction(t)}
                      className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Détails"
                    >
                      <Eye size={15} />
                    </button>

                    {isRedirected && (
                      <button
                        onClick={() =>
                          setRedirectionModal({ open: true, redirection: { ...t, redirection_id: t.redirection_id } })
                        }
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <Share2 size={13} />
                        Redirection
                      </button>
                    )}

                    {canFinalize && (
                      <button
                        onClick={() => canProcess && openFinalize(t)}
                        disabled={actionLoading !== null}
                        title={!canProcess ? "Traitement non autorisé" : ""}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors
                          ${!canProcess ? "opacity-30 cursor-not-allowed" : "disabled:opacity-40"}`}
                      >
                        <CheckCheck size={13} />
                        Effectuer
                      </button>
                    )}

                    {canCancel && (
                      <button
                        onClick={() => openCancel(t)}
                        disabled={actionLoading !== null}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40"
                      >
                        <Ban size={13} />
                        Annuler
                      </button>
                    )}

                    <button
                      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                      title="Télécharger"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Pagination ── */}
          {pagination.pages > 1 && (
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 mt-4 border border-gray-200">
              <div className="flex flex-col xs:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Lignes :</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) =>
                      setPagination((p) => ({
                        ...p,
                        limit: parseInt(e.target.value, 10),
                        page: 1,
                      }))
                    }
                    className="border border-gray-300 rounded px-2 py-1 text-xs"
                  >
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-gray-600">
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                  sur {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page === 1}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.pages}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.pages)}
                    disabled={pagination.page === pagination.pages}
                    className="p-1.5 rounded border border-gray-300 disabled:opacity-30 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}