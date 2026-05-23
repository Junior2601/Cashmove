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
  FileText,
  Calendar,
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
  User,
  MessageSquare,
  MapPin,
} from "lucide-react";

// ─── Modal de confirmation ───────────────────────────────────────────────────
function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel, confirmColor, loading,
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
            disabled={loading}
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

// ─── Modal de détail de redirection ──────────────────────────────────────────
function RedirectionDetailModal({ redirection, onClose, onAccept, onReject, actionLoading }) {
  if (!redirection) return null;

  const isPending = redirection.status === "pending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <Share2 size={15} className="text-indigo-600 flex-shrink-0" />
            <span className="font-mono text-indigo-600 font-semibold text-sm truncate">
              {redirection.tracking_code || "—"}
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
          <div className="grid grid-cols-2 gap-3">
            <InfoItem label="De (agent)" value={redirection.from_agent_name} />
            <InfoItem label="Email agent" value={redirection.from_agent_email} />
            <InfoItem
              label="Montant envoyé"
              value={redirection.send_amount ? `${fmt(redirection.send_amount)}` : "—"}
            />
            <InfoItem
              label="Montant redirigé"
              value={redirection.redirected_amount ? `${fmt(redirection.redirected_amount)}` : "—"}
            />
            <InfoItem
              label="Statut redirection"
              value={translateRedirectionStatus(redirection.status)}
              colored
              status={redirection.status}
            />
            <InfoItem
              label="Statut transaction"
              value={translateTransactionStatus(redirection.transaction_status)}
              colored
              status={redirection.transaction_status}
              statusType="transaction"
            />
            <InfoItem label="Raison" value={redirection.reason || "Non précisée"} />
            <InfoItem label="Reçue le" value={fmtDate(redirection.created_at)} />
            {redirection.processed_at && (
              <InfoItem label="Traitée le" value={fmtDate(redirection.processed_at)} />
            )}
          </div>
        </div>

        {/* Actions — uniquement si pending */}
        {isPending && (
          <div className="flex justify-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => onReject(redirection.id)}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 border border-red-300 bg-white rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {actionLoading === "reject"
                ? <Loader2 size={12} className="animate-spin" />
                : <Ban size={12} />}
              Refuser
            </button>
            <button
              onClick={() => onAccept(redirection.id)}
              disabled={actionLoading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === "accept"
                ? <Loader2 size={12} className="animate-spin" />
                : <CheckCheck size={12} />}
              Accepter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InfoItem({ label, value, colored, status, statusType = "redirection" }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {colored ? (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
            statusType === "transaction"
              ? getTransactionStatusColor(status)
              : getRedirectionStatusColor(status)
          }`}
        >
          {value}
        </span>
      ) : (
        <p className="text-sm font-medium text-gray-800 break-words">{value || "—"}</p>
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

function translateRedirectionStatus(status) {
  const map = {
    pending: "En attente",
    accepted: "Acceptée",
    rejected: "Refusée",
  };
  return map[status] || status || "Inconnu";
}

function translateTransactionStatus(status) {
  const map = {
    en_attente: "En attente",
    validee: "Validée",
    effectuee: "Effectuée",
    annulee: "Annulée",
    expiree: "Expirée",
    echouee: "Échouée",
  };
  return map[status] || status || "Inconnu";
}

function getRedirectionStatusColor(status) {
  switch (status) {
    case "accepted":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getTransactionStatusColor(status) {
  switch (status) {
    case "effectuee": case "validee":
      return "bg-green-100 text-green-800 border-green-200";
    case "en_attente":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "annulee": case "echouee": case "expiree":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getRedirectionStatusIcon(status) {
  switch (status) {
    case "accepted":
      return <CheckCircle size={14} className="text-green-600" />;
    case "pending":
      return <Clock size={14} className="text-yellow-600" />;
    case "rejected":
      return <XCircle size={14} className="text-red-600" />;
    default:
      return <AlertCircle size={14} className="text-gray-600" />;
  }
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function AgentRedirections() {
  const [redirections, setRedirections]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError]     = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  const [filters, setFilters]             = useState({ status: "" });
  const [showFilters, setShowFilters]     = useState(false);
  const [selectedRedirection, setSelectedRedirection] = useState(null);

  // Modales de confirmation rapide (depuis la liste)
  const [acceptModal, setAcceptModal] = useState({ open: false, redirection: null });
  const [rejectModal, setRejectModal] = useState({ open: false, redirection: null });

  // ── Charger les redirections ──────────────────────────────────────────────
  const fetchRedirections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;

      const res = await api.get("/redirections/mine", { params });

      if (res.data?.success) {
        setRedirections(res.data.data || []);
      } else {
        setRedirections([]);
      }
    } catch (err) {
      if (err.response?.status === 401) setError("Token invalide ou expiré.");
      else if (err.response?.status === 403) setError("Accès non autorisé.");
      else setError("Erreur lors de la récupération des redirections.");
      setRedirections([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => fetchRedirections(), 300);
    return () => clearTimeout(timer);
  }, [filters, fetchRedirections]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAccept = async (redirection_id) => {
    setActionLoading("accept");
    setActionError(null);
    try {
      await api.put(`/redirections/${redirection_id}/accept`);
      setActionSuccess("Redirection acceptée avec succès.");
      setAcceptModal({ open: false, redirection: null });
      setSelectedRedirection(null);
      fetchRedirections();
    } catch (err) {
      setActionError(err.response?.data?.message || "Erreur lors de l'acceptation.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (redirection_id) => {
    setActionLoading("reject");
    setActionError(null);
    try {
      await api.put(`/redirections/${redirection_id}/reject`);
      setActionSuccess("Redirection refusée.");
      setRejectModal({ open: false, redirection: null });
      setSelectedRedirection(null);
      fetchRedirections();
    } catch (err) {
      setActionError(err.response?.data?.message || "Erreur lors du refus.");
    } finally {
      setActionLoading(null);
    }
  };

  const openAcceptFromDetail = (id) => {
    setSelectedRedirection(null);
    setAcceptModal({ open: true, redirectionId: id });
  };

  const openRejectFromDetail = (id) => {
    setSelectedRedirection(null);
    setRejectModal({ open: true, redirectionId: id });
  };

  // ── Filtres ───────────────────────────────────────────────────────────────
  const handleFilterChange = (key, value) =>
    setFilters((p) => ({ ...p, [key]: value }));
  const resetFilters = () => setFilters({ status: "" });

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const activeFilters    = Object.entries(filters)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => ({ key: k, value: v }));

  // Compteurs par statut
  const counts = redirections.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {}
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-gray-50 min-h-screen">

      {/* ── Modales ── */}
      <ConfirmModal
        open={acceptModal.open}
        onClose={() => setAcceptModal({ open: false, redirectionId: null })}
        onConfirm={() => handleAccept(acceptModal.redirectionId)}
        title="Accepter la redirection"
        message="Voulez-vous accepter cette redirection ? La transaction vous sera assignée."
        confirmLabel="Oui, accepter"
        confirmColor="green"
        loading={actionLoading === "accept"}
      />

      <ConfirmModal
        open={rejectModal.open}
        onClose={() => setRejectModal({ open: false, redirectionId: null })}
        onConfirm={() => handleReject(rejectModal.redirectionId)}
        title="Refuser la redirection"
        message="Voulez-vous refuser cette redirection ? La transaction restera à l'agent initial."
        confirmLabel="Oui, refuser"
        confirmColor="red"
        loading={actionLoading === "reject"}
      />

      <RedirectionDetailModal
        redirection={selectedRedirection}
        onClose={() => setSelectedRedirection(null)}
        onAccept={openAcceptFromDetail}
        onReject={openRejectFromDetail}
        actionLoading={actionLoading}
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
              <Share2 size={20} className="text-indigo-600 flex-shrink-0" />
              <span className="truncate">Mes Redirections</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Redirections reçues d'autres agents pour traitement
            </p>
          </div>

          {/* Badges compteurs */}
          <div className="flex items-center gap-2 flex-wrap">
            {counts.pending > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                <Clock size={11} />
                {counts.pending} en attente
              </span>
            )}
            {counts.accepted > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                <CheckCircle size={11} />
                {counts.accepted} acceptée{counts.accepted > 1 ? "s" : ""}
              </span>
            )}
            {counts.rejected > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                <XCircle size={11} />
                {counts.rejected} refusée{counts.rejected > 1 ? "s" : ""}
              </span>
            )}
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
              onClick={fetchRedirections}
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
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="accepted">Acceptée</option>
                  <option value="rejected">Refusée</option>
                </select>
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
                <button onClick={() => handleFilterChange(key, "")}>
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
      {!loading && !error && redirections.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg mb-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <Share2 size={14} />
            <span className="font-medium">{redirections.length} redirection(s)</span>
          </div>
        </div>
      )}

      {/* ── États ── */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Chargement des redirections…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchRedirections}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Réessayer
          </button>
        </div>
      ) : redirections.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Share2 size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {hasActiveFilters
              ? "Aucune redirection ne correspond à vos critères"
              : "Aucune redirection reçue"}
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
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      De l'agent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Montant redirigé
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Raison
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
                  {redirections.map((r) => {
                    const isPending = r.status === "pending";
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        {/* Transaction */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Hash size={13} className="text-gray-400" />
                            <span className="font-mono text-blue-600 font-medium text-sm">
                              {r.tracking_code || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Agent émetteur */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">
                              {r.from_agent_name || "—"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {r.from_agent_email || ""}
                            </span>
                          </div>
                        </td>

                        {/* Montant */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 font-semibold text-gray-900 text-sm">
                            <DollarSign size={12} className="text-green-600" />
                            {fmt(r.redirected_amount)}
                          </div>
                        </td>

                        {/* Raison */}
                        <td className="px-4 py-3 max-w-[160px]">
                          <div className="flex items-start gap-1">
                            <MessageSquare size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-600 truncate max-w-[130px]" title={r.reason}>
                              {r.reason || "—"}
                            </span>
                          </div>
                        </td>

                        {/* Statut */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRedirectionStatusColor(r.status)}`}
                          >
                            {getRedirectionStatusIcon(r.status)}
                            {translateRedirectionStatus(r.status)}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-gray-400" />
                            {fmtDateShort(r.created_at)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {/* Détail */}
                            <button
                              title="Voir les détails"
                              onClick={() => setSelectedRedirection(r)}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Share2 size={15} />
                            </button>

                            {/* Accepter — seulement si pending */}
                            {isPending && (
                              <button
                                title="Accepter la redirection"
                                onClick={() =>
                                  setAcceptModal({ open: true, redirectionId: r.id })
                                }
                                disabled={actionLoading !== null}
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-40"
                              >
                                <CheckCheck size={15} />
                              </button>
                            )}

                            {/* Refuser — seulement si pending */}
                            {isPending && (
                              <button
                                title="Refuser la redirection"
                                onClick={() =>
                                  setRejectModal({ open: true, redirectionId: r.id })
                                }
                                disabled={actionLoading !== null}
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                              >
                                <Ban size={15} />
                              </button>
                            )}
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
            {redirections.map((r) => {
              const isPending = r.status === "pending";
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl shadow-sm p-3 border border-gray-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Hash size={13} className="text-blue-600 flex-shrink-0" />
                      <span className="font-mono text-blue-600 font-medium text-sm truncate">
                        {r.tracking_code || "N/A"}
                      </span>
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRedirectionStatusColor(r.status)} flex-shrink-0 ml-2`}
                    >
                      {getRedirectionStatusIcon(r.status)}
                      {translateRedirectionStatus(r.status)}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User size={11} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-900 font-medium text-xs">
                        {r.from_agent_name || "—"}
                      </span>
                      <span className="text-gray-400 text-xs truncate">
                        {r.from_agent_email || ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign size={11} className="text-green-600 flex-shrink-0" />
                      <span className="font-semibold text-gray-900 text-sm">
                        {fmt(r.redirected_amount)}
                      </span>
                    </div>
                    {r.reason && (
                      <div className="flex items-start gap-2">
                        <MessageSquare size={11} className="text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-gray-600 line-clamp-2">{r.reason}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-end">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={11} className="text-gray-400" />
                        <span className="text-xs text-gray-500">{fmtDateShort(r.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Boutons mobile */}
                  <div className="flex flex-wrap justify-center items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setSelectedRedirection(r)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <Share2 size={13} />
                      Détails
                    </button>

                    {isPending && (
                      <>
                        <button
                          onClick={() =>
                            setAcceptModal({ open: true, redirectionId: r.id })
                          }
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40"
                        >
                          <CheckCheck size={13} />
                          Accepter
                        </button>
                        <button
                          onClick={() =>
                            setRejectModal({ open: true, redirectionId: r.id })
                          }
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40"
                        >
                          <Ban size={13} />
                          Refuser
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}