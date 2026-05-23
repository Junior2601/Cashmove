import React, { useEffect, useState, useCallback } from "react";
import api from "../../api/axios";
import {
  Hash,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Loader2,
  Phone,
  MapPin,
  CreditCard,
  Tag,
  Calendar,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// ─── Modal de détail ──────────────────────────────────────────────────────────
function NumberDetailModal({ number, onClose }) {
  if (!number) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <Phone size={15} className="text-indigo-600 flex-shrink-0" />
            <span className="font-mono text-indigo-600 font-semibold text-sm truncate">
              {number.number || "—"}
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
            <InfoItem label="Numéro" value={number.number} />
            <InfoItem label="Label" value={number.label || "—"} />
            <InfoItem label="Pays" value={number.country_name} />
            <InfoItem label="Code pays" value={number.country_code} />
            <InfoItem label="Méthode de paiement" value={number.payment_method_name} />
            <InfoItem label="Devise" value={`${number.currency_name} (${number.currency_code})`} />
            <InfoItem
              label="Statut"
              value={number.is_active ? "Actif" : "Inactif"}
              colored
              isActive={number.is_active}
            />
            {number.created_at && (
              <InfoItem label="Créé le" value={fmtDate(number.created_at)} />
            )}
            {number.updated_at && (
              <InfoItem label="Mis à jour le" value={fmtDate(number.updated_at)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InfoItem({ label, value, colored, isActive }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {colored ? (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
            isActive
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-red-100 text-red-800 border-red-200"
          }`}
        >
          {isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
          {value}
        </span>
      ) : (
        <p className="text-sm font-medium text-gray-800 break-words">{value || "—"}</p>
      )}
    </div>
  );
}

const fmtDate = (d) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtDateShort = (d) => {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

// ─── Composant principal ───────────────────────────────────────────────────────
export default function AgentNumbers() {
  const [numbers, setNumbers]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [filters, setFilters]             = useState({ is_active: "", country: "", payment_method: "" });
  const [showFilters, setShowFilters]     = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);

  // ── Charger les numéros ───────────────────────────────────────────────────
  const fetchNumbers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/authorized_numbers/me");
      if (res.data?.success) {
        setNumbers(res.data.data || []);
      } else {
        setNumbers([]);
      }
    } catch (err) {
      if (err.response?.status === 401) setError("Token invalide ou expiré.");
      else if (err.response?.status === 403) setError("Accès non autorisé.");
      else setError("Erreur lors de la récupération des numéros autorisés.");
      setNumbers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNumbers();
  }, [fetchNumbers]);

  // ── Filtres côté client ───────────────────────────────────────────────────
  const filteredNumbers = numbers.filter((n) => {
    if (filters.is_active !== "") {
      const activeVal = filters.is_active === "true";
      if (n.is_active !== activeVal) return false;
    }
    if (filters.country && !n.country_name?.toLowerCase().includes(filters.country.toLowerCase())) {
      return false;
    }
    if (
      filters.payment_method &&
      !n.payment_method_name?.toLowerCase().includes(filters.payment_method.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleFilterChange = (key, value) =>
    setFilters((p) => ({ ...p, [key]: value }));
  const resetFilters = () => setFilters({ is_active: "", country: "", payment_method: "" });

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");
  const activeFilters = Object.entries(filters)
    .filter(([, v]) => v !== "")
    .map(([k, v]) => ({ key: k, value: v }));

  // Compteurs
  const counts = numbers.reduce(
    (acc, n) => {
      if (n.is_active) acc.active += 1;
      else acc.inactive += 1;
      return acc;
    },
    { active: 0, inactive: 0 }
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-3 sm:p-4 lg:p-6 bg-gray-50 min-h-screen">

      {/* ── Modal détail ── */}
      <NumberDetailModal
        number={selectedNumber}
        onClose={() => setSelectedNumber(null)}
      />

      {/* ── En-tête ── */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2 truncate">
              <Phone size={20} className="text-indigo-600 flex-shrink-0" />
              <span className="truncate">Mes Numéros Autorisés</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Numéros de paiement associés à votre compte agent
            </p>
          </div>

          {/* Badges compteurs */}
          <div className="flex items-center gap-2 flex-wrap">
            {counts.active > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                <CheckCircle size={11} />
                {counts.active} actif{counts.active > 1 ? "s" : ""}
              </span>
            )}
            {counts.inactive > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                <XCircle size={11} />
                {counts.inactive} inactif{counts.inactive > 1 ? "s" : ""}
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
              onClick={fetchNumbers}
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
                  value={filters.is_active}
                  onChange={(e) => handleFilterChange("is_active", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="true">Actif</option>
                  <option value="false">Inactif</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Pays</label>
                <input
                  type="text"
                  value={filters.country}
                  onChange={(e) => handleFilterChange("country", e.target.value)}
                  placeholder="Filtrer par pays..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-700">Méthode de paiement</label>
                <input
                  type="text"
                  value={filters.payment_method}
                  onChange={(e) => handleFilterChange("payment_method", e.target.value)}
                  placeholder="Filtrer par méthode..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 text-sm"
                />
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
                {value === "true" ? "Actif" : value === "false" ? "Inactif" : value}
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

      {/* ── Compteur résultats ── */}
      {!loading && !error && filteredNumbers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-lg mb-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <Phone size={14} />
            <span className="font-medium">{filteredNumbers.length} numéro(s) autorisé(s)</span>
          </div>
        </div>
      )}

      {/* ── États ── */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-3 text-gray-500 text-sm">Chargement des numéros autorisés…</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle size={32} className="text-red-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={fetchNumbers}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            Réessayer
          </button>
        </div>
      ) : filteredNumbers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Phone size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {hasActiveFilters
              ? "Aucun numéro ne correspond à vos critères"
              : "Aucun numéro autorisé associé à votre compte"}
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
                      Numéro
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Label
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pays
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Méthode de paiement
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Devise
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredNumbers.map((n) => (
                    <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                      {/* Numéro */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Hash size={13} className="text-gray-400" />
                          <span className="font-mono text-blue-600 font-medium text-sm">
                            {n.number}
                          </span>
                        </div>
                      </td>

                      {/* Label */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Tag size={12} className="text-gray-400" />
                          <span className="text-sm text-gray-600">{n.label || "—"}</span>
                        </div>
                      </td>

                      {/* Pays */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {n.country_name || "—"}
                          </span>
                          <span className="text-xs text-gray-400">{n.country_code || ""}</span>
                        </div>
                      </td>

                      {/* Méthode de paiement */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <CreditCard size={12} className="text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {n.payment_method_name || "—"}
                          </span>
                        </div>
                      </td>

                      {/* Devise */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {n.currency_code ? `${n.currency_name} (${n.currency_code})` : "—"}
                        </span>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${
                            n.is_active
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }`}
                        >
                          {n.is_active ? (
                            <CheckCircle size={11} />
                          ) : (
                            <XCircle size={11} />
                          )}
                          {n.is_active ? "Actif" : "Inactif"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          title="Voir les détails"
                          onClick={() => setSelectedNumber(n)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Phone size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CARTES mobile ── */}
          <div className="md:hidden space-y-3">
            {filteredNumbers.map((n) => (
              <div
                key={n.id}
                className="bg-white rounded-xl shadow-sm p-3 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Hash size={13} className="text-blue-600 flex-shrink-0" />
                    <span className="font-mono text-blue-600 font-medium text-sm truncate">
                      {n.number}
                    </span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ml-2 ${
                      n.is_active
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-red-100 text-red-800 border-red-200"
                    }`}
                  >
                    {n.is_active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                    {n.is_active ? "Actif" : "Inactif"}
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {n.label && (
                    <div className="flex items-center gap-2">
                      <Tag size={11} className="text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-600">{n.label}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin size={11} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-900">
                      {n.country_name || "—"}
                    </span>
                    {n.country_code && (
                      <span className="text-xs text-gray-400">({n.country_code})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard size={11} className="text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700">
                      {n.payment_method_name || "—"}
                    </span>
                  </div>
                  {n.currency_code && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 ml-4">
                        {n.currency_name} ({n.currency_code})
                      </span>
                    </div>
                  )}
                </div>

                {/* Bouton mobile */}
                <div className="flex justify-center mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setSelectedNumber(n)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    <Phone size={13} />
                    Détails
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}