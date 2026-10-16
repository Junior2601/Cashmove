// src/components/BalanceHistoryButton.jsx
import { useState } from "react";
import { Calendar, X, TrendingUp, TrendingDown, RefreshCw, Trash2 } from "lucide-react";
import api from "../api/axios";

const ACTION_CONFIG = {
  credit: { label: "Crédit", sign: "+", classes: "bg-green-100 text-green-700", Icon: TrendingUp },
  debit: { label: "Débit", sign: "−", classes: "bg-orange-100 text-orange-700", Icon: TrendingDown },
  update: { label: "Ajustement", sign: "", classes: "bg-blue-100 text-blue-700", Icon: RefreshCw },
  delete: { label: "Suppression", sign: "", classes: "bg-red-100 text-red-700", Icon: Trash2 },
};

export default function BalanceHistoryButton({ balance, className = "" }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async (e) => {
    e?.stopPropagation();
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/history/entity/balance/${balance.id}`);
      setRows(data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors du chargement de l'historique");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setOpen(false);
    setError(null);
  };

  const parseMeta = (metadata) => {
    if (!metadata) return {};
    if (typeof metadata === "string") {
      try {
        return JSON.parse(metadata);
      } catch {
        return {};
      }
    }
    return metadata;
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "-";

  const fmtAmount = (n) =>
    n === undefined || n === null
      ? ""
      : new Intl.NumberFormat("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(n);

  return (
    <>
      <button
        onClick={load}
        title="Voir l'historique"
        className={`text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 ${className}`}
      >
        <Calendar size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black bg-opacity-40 p-3 sm:p-4 overflow-y-auto"
          onClick={close}
        >
          <div
            className="bg-white rounded-xl shadow-lg w-full max-w-lg mt-8 sm:mt-0 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-200">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                  <Calendar size={18} />
                  Historique de la balance
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">
                  {balance.agent_name || "Agent"} — {balance.currency_code || ""}
                </p>
              </div>
              <button onClick={close} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            {/* Corps */}
            <div className="overflow-y-auto p-4 sm:p-5">
              {loading && (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              )}

              {!loading && error && (
                <p className="text-center text-red-500 py-8 text-sm">{error}</p>
              )}

              {!loading && !error && rows.length === 0 && (
                <p className="text-center text-gray-400 py-8 text-sm">Aucune opération enregistrée</p>
              )}

              {!loading && !error && rows.length > 0 && (
                <ul className="space-y-3">
                  {rows.map((h) => {
                    const meta = parseMeta(h.metadata);
                    const cfg = ACTION_CONFIG[h.action_type] || {
                      label: h.action_type,
                      sign: "",
                      classes: "bg-gray-100 text-gray-700",
                      Icon: RefreshCw,
                    };
                    const { Icon } = cfg;
                    return (
                      <li
                        key={h.id}
                        className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                      >
                        <span
                          className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${cfg.classes}`}
                        >
                          <Icon size={12} />
                          {cfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          {meta.amount !== undefined && (
                            <p className="text-sm font-semibold text-gray-800">
                              {cfg.sign}
                              {fmtAmount(meta.amount)} {meta.currency_code || balance.currency_code || ""}
                            </p>
                          )}
                          {(meta.old_amount !== undefined || meta.new_amount !== undefined) && (
                            <p className="text-xs text-gray-500">
                              {fmtAmount(meta.old_amount)} → {fmtAmount(meta.new_amount)}
                            </p>
                          )}
                          {h.description && (
                            <p className="text-xs text-gray-600 mt-0.5">{h.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {fmtDate(h.created_at)}
                            {h.actor_type ? ` · ${h.actor_type}` : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Pied */}
            <div className="px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={close}
                className="px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
