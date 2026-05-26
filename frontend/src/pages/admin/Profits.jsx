import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);

const fmtTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const isPos = (n) => (n ?? 0) >= 0;

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className={`font-bold text-base ${val >= 0 ? "text-green-600" : "text-red-600"}`}>
        {val >= 0 ? "+" : ""}
        {fmt(val)} ₽
      </p>
    </div>
  );
};

// Indicateur LIVE pulsé
const LiveDot = ({ active }) => (
  <span className="inline-flex items-center gap-1.5">
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        active ? "bg-green-500 animate-pulse" : "bg-gray-400"
      }`}
    />
    <span
      className={`text-xs font-bold tracking-wide ${
        active ? "text-green-600" : "text-gray-400"
      }`}
    >
      {active ? "LIVE" : "PAUSE"}
    </span>
  </span>
);

// Spinner générique
const Spinner = () => (
  <div className="flex justify-center py-10">
    <div className="w-8 h-8 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin" />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminProfit() {
  const navigate = useNavigate();

  // ── État période ──
  const [period, setPeriod] = useState("day");
  const [date, setDate]     = useState(new Date().toISOString().split("T")[0]);

  // ── État profit par période ──
  const [profitData, setProfitData] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // ── État balances actuelles ──
  const [currentBalances, setCurrentBalances]   = useState(null);
  const [balancesLoading, setBalancesLoading]   = useState(true);

  // ── État snapshot ──
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMsg, setSnapshotMsg]         = useState("");

  // ── État transactions en temps réel ──
  const [txProfits, setTxProfits]   = useState(null);
  const [txLoading, setTxLoading]   = useState(true);
  const [liveActive, setLiveActive] = useState(true);
  const [countdown, setCountdown]   = useState(30);

  // IDs des nouvelles transactions pour l'animation flash
  const [newTxIds, setNewTxIds]       = useState(new Set());
  const prevTxIdsRef                  = useRef(new Set());
  const liveTimerRef                  = useRef(null);
  const countdownRef                  = useRef(null);

  // ── Auth ──
  const getToken = useCallback(() => {
    const t = localStorage.getItem("token");
    if (!t) { navigate("/admin/login"); return null; }
    return t;
  }, [navigate]);

  // ─── Fetch profit par période ────────────────────────────────────────────
  const fetchProfit = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/profit?period=${period}&date=${date}`);
      setProfitData(res.data?.data ?? null);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/admin/login");
        return;
      }
      setError(err.response?.data?.message || "Erreur lors du chargement du bénéfice");
      setProfitData(null);
    } finally {
      setLoading(false);
    }
  }, [period, date, getToken, navigate]);

  // ─── Fetch balances actuelles ────────────────────────────────────────────
  const fetchCurrentBalances = useCallback(async () => {
    if (!getToken()) return;
    setBalancesLoading(true);
    try {
      const res = await api.get("/profit/current");
      setCurrentBalances(res.data?.data ?? null);
    } catch {
      setCurrentBalances(null);
    } finally {
      setBalancesLoading(false);
    }
  }, [getToken]);

  // ─── Fetch profits par transaction ───────────────────────────────────────
  const fetchTxProfits = useCallback(
    async (silent = false) => {
      if (!getToken()) return;
      if (!silent) setTxLoading(true);
      try {
        const res = await api.get(`/profit/transactions?date=${date}&limit=50`);
        const data = res.data?.data ?? null;

        // Détecter les nouvelles lignes pour l'animation flash
        if (data?.transactions) {
          const newIds  = new Set(data.transactions.map((t) => t.id));
          const appeared = new Set(
            [...newIds].filter((id) => !prevTxIdsRef.current.has(id))
          );
          if (appeared.size > 0 && prevTxIdsRef.current.size > 0) {
            setNewTxIds(appeared);
            setTimeout(() => setNewTxIds(new Set()), 2500);
          }
          prevTxIdsRef.current = newIds;
        }

        setTxProfits(data);
      } catch {
        /* silencieux */
      } finally {
        if (!silent) setTxLoading(false);
      }
    },
    [getToken, date]
  );

  // ─── Timer LIVE ──────────────────────────────────────────────────────────
  const resetLiveTimer = useCallback(() => {
    clearInterval(liveTimerRef.current);
    clearInterval(countdownRef.current);
    setCountdown(30);

    if (!liveActive) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1));
    }, 1000);

    liveTimerRef.current = setInterval(() => {
      fetchTxProfits(true);
      fetchCurrentBalances();
      setCountdown(30);
    }, 30_000);
  }, [liveActive, fetchTxProfits, fetchCurrentBalances]);

  useEffect(() => { fetchProfit(); },          [fetchProfit]);
  useEffect(() => { fetchCurrentBalances(); },  [fetchCurrentBalances]);
  useEffect(() => { fetchTxProfits(); },        [fetchTxProfits]);
  useEffect(() => {
    resetLiveTimer();
    return () => {
      clearInterval(liveTimerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [resetLiveTimer]);

  // ─── Snapshot ────────────────────────────────────────────────────────────
  const handleSnapshot = async (type) => {
    if (!getToken()) return;
    setSnapshotLoading(true);
    setSnapshotMsg("");
    try {
      await api.post("/profit/snapshot", { type });
      setSnapshotMsg(`✅ Snapshot "${type}" pris avec succès`);
      fetchProfit();
      fetchCurrentBalances();
    } catch (err) {
      setSnapshotMsg(`❌ ${err.response?.data?.message || "Erreur snapshot"}`);
    } finally {
      setSnapshotLoading(false);
      setTimeout(() => setSnapshotMsg(""), 4000);
    }
  };

  // ─── Données graphique ───────────────────────────────────────────────────
  const buildChartData = () => {
    if (!profitData || period === "day") return [];
    if (Array.isArray(profitData.days)) {
      return profitData.days.map((d) => ({
        label:  d.date,
        profit: parseFloat(d.profit_rub ?? 0),
      }));
    }
    return [];
  };

  const chartData    = buildChartData();
  const mainProfit   = profitData?.total_profit_rub ?? 0;
  const startBalance = profitData?.start_balance_rub ?? 0;
  const endBalance   = profitData?.end_balance_rub ?? 0;
  const profit       = isPos(mainProfit);
  const periodLabel  = { day: "Journée", week: "Semaine", month: "Mois" }[period];
  const txSummary    = txProfits?.summary ?? { count: 0, total_profit_rub: 0, total_gain_rub: 0 };
  const txList       = txProfits?.transactions ?? [];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Bénéfices & Pertes
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Suivi des profits par période</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              fetchProfit();
              fetchCurrentBalances();
              fetchTxProfits();
              resetLiveTimer();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
          <button
            onClick={() => handleSnapshot("start_of_day")}
            disabled={snapshotLoading}
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
          >
            📸 Snapshot début
          </button>
          <button
            onClick={() => handleSnapshot("end_of_day")}
            disabled={snapshotLoading}
            className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50"
          >
            📸 Snapshot fin
          </button>
        </div>
      </div>

      {/* Message snapshot */}
      {snapshotMsg && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm font-medium ${
            snapshotMsg.startsWith("✅")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {snapshotMsg}
        </div>
      )}

      {/* ══ SÉLECTEUR PÉRIODE / DATE ═════════════════════════════════════════ */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-4 shadow-sm border border-gray-100 mb-5">
        <div className="flex gap-2 mb-3">
          {["day", "week", "month"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                period === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {{ day: "Jour", week: "Semaine", month: "Mois" }[p]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 font-medium">Date :</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-5">
          {error}
        </div>
      )}

      {/* ══ CARTES MÉTRIQUES + GRAPHIQUE + DÉTAIL ═══════════════════════════ */}
      {loading ? (
        <Spinner />
      ) : (
        <>
          {/* Cartes principales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            {/* Résultat période */}
            <div
              className={`bg-white rounded-xl lg:rounded-2xl p-4 shadow-sm border-l-4 ${
                profit ? "border-green-500" : "border-red-500"
              }`}
            >
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                Résultat — {periodLabel}
              </p>
              <p className={`text-2xl font-bold ${profit ? "text-green-600" : "text-red-600"}`}>
                {profit ? "+" : ""}
                {fmt(mainProfit)} ₽
              </p>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  profit
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {profit ? "▲ BÉNÉFICE" : "▼ PERTE"}
              </span>
            </div>

            {/* Balance début */}
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 shadow-sm border-l-4 border-violet-400">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                Balance début de période
              </p>
              <p className="text-2xl font-bold text-gray-800">{fmt(startBalance)} ₽</p>
            </div>

            {/* Balance fin */}
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 shadow-sm border-l-4 border-amber-400">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">
                Balance fin de période
              </p>
              <p className="text-2xl font-bold text-gray-800">{fmt(endBalance)} ₽</p>
            </div>
          </div>

          {/* Graphique semaine / mois */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 mb-5">
              <h2 className="text-base font-bold text-gray-800 mb-4">Évolution</h2>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(37,99,235,0.04)" }} />
                    <ReferenceLine y={0} stroke="#e5e7eb" />
                    <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.profit >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />
                  Bénéfice
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
                  Perte
                </span>
              </div>
            </div>
          )}

          {/* Détail période */}
          {profitData && (
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 mb-5">
              <h2 className="text-base font-bold text-gray-800 mb-4">
                Détail —{" "}
                {period === "day"
                  ? date
                  : `${profitData.from || ""} → ${profitData.to || ""}`}
              </h2>

              {period === "day" ? (
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {[
                      { label: "Date", val: profitData.from || date, cls: "text-gray-800 font-semibold" },
                      { label: "Balance début (RUB)", val: `${fmt(startBalance)} ₽`, cls: "text-gray-800 font-semibold" },
                      { label: "Balance fin (RUB)",   val: `${fmt(endBalance)} ₽`,   cls: "text-gray-800 font-semibold" },
                      {
                        label: "Profit / Perte",
                        val: `${profit ? "+" : ""}${fmt(mainProfit)} ₽`,
                        cls: `font-bold ${profit ? "text-green-600" : "text-red-600"}`,
                      },
                    ].map((row, i) => (
                      <tr key={i}>
                        <td className="py-2.5 px-3 text-gray-400">{row.label}</td>
                        <td className={`py-2.5 px-3 text-right ${row.cls}`}>{row.val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : profitData.days?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
                      <tr>
                        {["Date", "Début (RUB)", "Fin (RUB)", "Profit (RUB)", "Résultat"].map((h) => (
                          <th key={h} className="px-4 py-2 text-left font-semibold tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {profitData.days.map((day, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700">{day.date}</td>
                          <td className="px-4 py-2.5">{fmt(day.start_balance_rub)}</td>
                          <td className="px-4 py-2.5">{fmt(day.end_balance_rub)}</td>
                          <td className={`px-4 py-2.5 font-semibold ${day.profit_rub >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {day.profit_rub !== null
                              ? (day.profit_rub >= 0 ? "+" : "") + fmt(day.profit_rub)
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            {day.profit_rub !== null ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                  day.profit_rub >= 0
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {day.profit_rub >= 0 ? "Bénéfice" : "Perte"}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">Incomplet</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-6 text-sm">
                  Aucune donnée journalière disponible
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PROFIT PAR TRANSACTION — TEMPS RÉEL
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 mb-5">

        {/* Header */}
        <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Profit par transaction
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Bénéfice réalisé sur chaque opération effectuée le {date} — spread de taux +0,20
            </p>
          </div>

          <div className="flex items-center gap-2">
            <LiveDot active={liveActive} />
            <button
              onClick={() => setLiveActive((v) => !v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                liveActive
                  ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                  : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
              }`}
            >
              {liveActive ? `Pause (${countdown}s)` : "Reprendre"}
            </button>
            <button
              onClick={() => { fetchTxProfits(); resetLiveTimer(); }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
            >
              ↻ Rafraîchir
            </button>
          </div>
        </div>

        {/* Cartes résumé */}
        {!txLoading && txProfits && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-extrabold text-gray-900">{txSummary.count}</p>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
                Transactions
              </p>
            </div>
            <div
              className={`rounded-xl p-3 text-center ${
                txSummary.total_profit_rub >= 0 ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <p
                className={`text-xl font-extrabold ${
                  txSummary.total_profit_rub >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {txSummary.total_profit_rub >= 0 ? "+" : ""}
                {fmt(txSummary.total_profit_rub)} ₽
              </p>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
                Profit total (RUB)
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-amber-600">
                {fmt(txSummary.total_gain_rub)}
              </p>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">
                Gains agents
              </p>
            </div>
          </div>
        )}

        {/* Tableau transactions */}
        {txLoading ? (
          <Spinner />
        ) : txList.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">Aucune transaction effectuée ce jour</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <style>{`
              @keyframes flashNew {
                0%   { background-color: #dbeafe; }
                100% { background-color: transparent; }
              }
              .tx-new { animation: flashNew 2.5s ease-out forwards; }
              .tx-row:hover td { background-color: #f9fafb; }
            `}</style>
            <table className="w-full text-sm" style={{ minWidth: 640 }}>
              <thead>
                <tr className="border-b-2 border-gray-100">
                  {[
                    "Heure",
                    "Code",
                    "Trajet",
                    "Envoyé",
                    "Reçu",
                    "Taux / Comm.",
                    "Agent",
                    "Profit entreprise",
                    "Gain agent",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txList.map((tx) => {
                  const isNew = newTxIds.has(tx.id);
                  return (
                    <tr
                      key={tx.id}
                      className={`tx-row border-b border-gray-50 ${isNew ? "tx-new" : ""}`}
                    >
                      {/* Heure */}
                      <td className="px-3 py-3 text-gray-400 text-xs tabular-nums whitespace-nowrap">
                        {fmtTime(tx.completed_at)}
                      </td>

                      {/* Code de suivi */}
                      <td className="px-3 py-3">
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {tx.tracking_code}
                        </span>
                      </td>

                      {/* Trajet */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="font-bold text-gray-800">{tx.from_currency}</span>
                        <span className="text-gray-300 mx-1">→</span>
                        <span className="font-bold text-gray-800">{tx.to_currency}</span>
                        <span className="block text-xs text-gray-400">
                          {tx.from_country} → {tx.to_country}
                        </span>
                      </td>

                      {/* Envoyé */}
                      <td className="px-3 py-3 tabular-nums font-medium text-gray-700 whitespace-nowrap">
                        {fmt(tx.send_amount)}{" "}
                        <span className="text-gray-400 text-xs">{tx.from_symbol}</span>
                      </td>

                      {/* Reçu */}
                      <td className="px-3 py-3 tabular-nums font-medium text-gray-700 whitespace-nowrap">
                        {fmt(tx.receive_amount)}{" "}
                        <span className="text-gray-400 text-xs">{tx.to_symbol}</span>
                      </td>

                      {/* Taux / Commission */}
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                        <span className="font-semibold text-gray-700">{tx.rate_applied}</span>
                        <span className="block text-gray-400">{tx.commission_applied}% comm.</span>
                      </td>

                      {/* Agent */}
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {tx.agent_name}
                      </td>

                      {/* Profit entreprise ← COLONNE CLÉ */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`font-bold text-base tabular-nums ${
                            tx.profit_rub >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.profit_rub >= 0 ? "+" : ""}
                          {fmt(tx.profit_rub)} ₽
                        </span>
                        <span className="block text-xs text-gray-300 mt-0.5">
                          spread ×0,20
                        </span>
                      </td>

                      {/* Gain agent */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        {tx.gain_amount != null ? (
                          <span className="text-amber-600 font-semibold tabular-nums text-sm">
                            {fmt(tx.gain_amount)}{" "}
                            <span className="text-xs font-normal">{tx.gain_symbol}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Ligne total */}
              {txList.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={7} className="px-3 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Total ({txSummary.count} transactions)
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`font-extrabold text-base tabular-nums ${
                          txSummary.total_profit_rub >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {txSummary.total_profit_rub >= 0 ? "+" : ""}
                        {fmt(txSummary.total_profit_rub)} ₽
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-extrabold text-amber-600 tabular-nums text-base">
                        {fmt(txSummary.total_gain_rub)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {txProfits?.computed_at && (
          <p className="text-right text-xs text-gray-300 mt-3">
            Calculé à {fmtTime(txProfits.computed_at)}
          </p>
        )}
      </div>

      {/* ══ BALANCES ACTUELLES ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-gray-900">
            Balances actuelles (temps réel)
          </h2>
          {currentBalances?.computed_at && (
            <span className="text-xs text-gray-400">
              Calculé à {new Date(currentBalances.computed_at).toLocaleTimeString("fr-FR")}
            </span>
          )}
        </div>

        {balancesLoading ? (
          <Spinner />
        ) : !currentBalances?.agents?.length ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            Aucune donnée de balance disponible
          </p>
        ) : (
          <>
            <div className="mb-3 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Total général (RUB)</span>
              <span className="text-xl font-extrabold text-gray-900">
                {fmt(currentBalances.grand_total_rub)} ₽
              </span>
            </div>

            {currentBalances.unrealized_profit_rub !== null && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-800">
                  Profit non réalisé (aujourd'hui)
                </span>
                <span
                  className={`text-xl font-extrabold ${
                    currentBalances.unrealized_profit_rub >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {currentBalances.unrealized_profit_rub >= 0 ? "+" : ""}
                  {fmt(currentBalances.unrealized_profit_rub)} ₽
                </span>
              </div>
            )}

            <div className="space-y-3">
              {currentBalances.agents.map((agent) => (
                <div
                  key={agent.agent_id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="font-bold text-gray-800 text-sm">
                      {agent.agent_name}
                    </span>
                    <span className="text-sm font-bold text-blue-700">
                      {fmt(agent.total_rub)} ₽
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase bg-white border-b border-gray-50">
                          <th className="px-4 py-2 text-left font-semibold">Devise</th>
                          <th className="px-4 py-2 text-right font-semibold">Montant</th>
                          <th className="px-4 py-2 text-right font-semibold hidden sm:table-cell">
                            Taux interne
                          </th>
                          <th className="px-4 py-2 text-right font-semibold">≈ RUB</th>
                          <th className="px-4 py-2 text-right font-semibold hidden md:table-cell">
                            Mis à jour
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {agent.balances.map((b, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <span className="font-bold text-gray-800">{b.currency}</span>
                              <span className="text-gray-400 ml-1 text-xs">
                                {b.currency_symbol}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-700 font-medium tabular-nums">
                              {fmt(b.amount)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-400 hidden sm:table-cell tabular-nums">
                              {b.rate_internal != null ? fmt(b.rate_internal) : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-blue-700 tabular-nums">
                              {fmt(b.amount_rub)} ₽
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-400 text-xs hidden md:table-cell">
                              {b.last_updated
                                ? new Date(b.last_updated).toLocaleTimeString("fr-FR")
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}