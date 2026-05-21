import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

const isProfit = (n) => (n ?? 0) >= 0;

// ─── Custom Tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  const profit = val >= 0;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className={`font-bold text-base ${profit ? 'text-green-600' : 'text-red-600'}`}>
        {profit ? '+' : ''}{fmt(val)} ₽
      </p>
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────
export default function AdminProfit() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState('day');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [profitData, setProfitData] = useState(null);
  const [currentBalances, setCurrentBalances] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotMsg, setSnapshotMsg] = useState('');

  // ── Auth ──
  const getToken = useCallback(() => {
    const t = localStorage.getItem('token');
    if (!t) { navigate('/admin/login'); return null; }
    return t;
  }, [navigate]);

  // ── Fetch profit (période) ──
  const fetchProfit = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/profit?period=${period}&date=${date}`);
      setProfitData(res.data?.data ?? null);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/admin/login');
        return;
      }
      setError(err.response?.data?.message || 'Erreur lors du chargement du bénéfice');
      setProfitData(null);
    } finally {
      setLoading(false);
    }
  }, [period, date, getToken, navigate]);

  // ── Fetch current balances ──
  const fetchCurrentBalances = useCallback(async () => {
    if (!getToken()) return;
    setBalancesLoading(true);
    try {
      const res = await api.get('/profit/current');
      setCurrentBalances(res.data?.data ?? null);
    } catch {
      setCurrentBalances(null);
    } finally {
      setBalancesLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchProfit(); }, [fetchProfit]);
  useEffect(() => { fetchCurrentBalances(); }, [fetchCurrentBalances]);

  // ── Snapshot manuel ──
  const handleSnapshot = async (type) => {
    if (!getToken()) return;
    setSnapshotLoading(true);
    setSnapshotMsg('');
    try {
      await api.post('/profit/snapshot', { type });
      setSnapshotMsg(`✅ Snapshot "${type}" pris avec succès`);
      // Rafraîchir les données (le snapshot change les balances)
      fetchProfit();
      fetchCurrentBalances();
    } catch (err) {
      setSnapshotMsg(`❌ ${err.response?.data?.message || 'Erreur snapshot'}`);
    } finally {
      setSnapshotLoading(false);
      setTimeout(() => setSnapshotMsg(''), 4000);
    }
  };

  // ── Construction des données pour le graphique ──
  // Pour 'day' : pas de graphique (un seul point)
  // Pour 'week' / 'month' : on utilise profitData.days
  const buildChartData = () => {
    if (!profitData) return [];
    if (period === 'day') return []; // Pas de graphique pour un seul jour
    if (profitData.days && Array.isArray(profitData.days)) {
      return profitData.days.map((day) => ({
        label: day.date,
        profit: parseFloat(day.profit_rub ?? 0),
      }));
    }
    return [];
  };

  const chartData = buildChartData();
  const mainProfit = profitData?.total_profit_rub ?? 0;
  const startBalance = profitData?.start_balance_rub ?? 0;
  const endBalance = profitData?.end_balance_rub ?? 0;
  const profit = isProfit(mainProfit);

  const periodLabel = { day: 'Journée', week: 'Semaine', month: 'Mois' }[period];

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Bénéfices & Pertes</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">Suivi des profits par période</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { fetchProfit(); fetchCurrentBalances(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
          <button
            onClick={() => handleSnapshot('start_of_day')}
            disabled={snapshotLoading}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium text-sm"
          >
            📸 Snapshot début
          </button>
          <button
            onClick={() => handleSnapshot('end_of_day')}
            disabled={snapshotLoading}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium text-sm"
          >
            📸 Snapshot fin
          </button>
        </div>
      </div>

      {/* ── Message snapshot ── */}
      {snapshotMsg && (
        <div className={`px-4 py-3 rounded-lg mb-4 text-sm font-medium ${snapshotMsg.startsWith('✅') ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
          {snapshotMsg}
        </div>
      )}

      {/* ── Erreur ── */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-800 font-bold">×</button>
        </div>
      )}

      {/* ── Filtres ── */}
      <div className="bg-white rounded-xl p-4 shadow-lg mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['day', 'week', 'month'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${period === p ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              {{ day: 'Jour', week: 'Semaine', month: 'Mois' }[p]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">Date :</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* ── Cartes KPI ── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-6">
            {/* Bénéfice / Perte principal */}
            <div className={`bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border-l-4 ${profit ? 'border-green-500' : 'border-red-500'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs lg:text-sm font-medium">Résultat — {periodLabel}</p>
                  <p className={`text-2xl lg:text-3xl font-bold mt-1 ${profit ? 'text-green-600' : 'text-red-600'}`}>
                    {profit ? '+' : ''}{fmt(mainProfit)} ₽
                  </p>
                </div>
                <div className={`p-3 rounded-full ${profit ? 'bg-green-100' : 'bg-red-100'}`}>
                  <span className="text-2xl">{profit ? '📈' : '📉'}</span>
                </div>
              </div>
              <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${profit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {profit ? '▲ BÉNÉFICE' : '▼ PERTE'}
              </div>
            </div>

            {/* Balance début */}
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs lg:text-sm font-medium">Balance début de période</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">{fmt(startBalance)} ₽</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <span className="text-xl">🏦</span>
                </div>
              </div>
            </div>

            {/* Balance fin */}
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-xs lg:text-sm font-medium">Balance fin de période</p>
                  <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">{fmt(endBalance)} ₽</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <span className="text-xl">💼</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Graphique (semaine/mois) ── */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Évolution du résultat ({periodLabel})</h2>
              <div className="h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" fontSize={12} tick={{ fill: '#6b7280' }} />
                    <YAxis fontSize={12} tick={{ fill: '#6b7280' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1.5} />
                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block"></span>Bénéfice</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>Perte</span>
              </div>
            </div>
          )}

          {/* ── Détail de la période ── */}
          {profitData && (
            <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Détail — {period === 'day' ? date : `${profitData.from || ''} → ${profitData.to || ''}`}
              </h2>

              {period === 'day' ? (
                // Jour : afficher les métriques sous forme de tableau simple
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-2 px-3 text-gray-500">Date</td>
                        <td className="py-2 px-3 font-semibold text-right">{profitData.from || date}</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-gray-500">Balance début (RUB)</td>
                        <td className="py-2 px-3 font-semibold text-right">{fmt(startBalance)} ₽</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-gray-500">Balance fin (RUB)</td>
                        <td className="py-2 px-3 font-semibold text-right">{fmt(endBalance)} ₽</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="py-2 px-3 text-gray-500 font-medium">Profit / Perte</td>
                        <td className={`py-2 px-3 font-bold text-right ${profit ? 'text-green-600' : 'text-red-600'}`}>
                          {profit ? '+' : ''}{fmt(mainProfit)} ₽
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                // Semaine / Mois : afficher le tableau des jours
                profitData.days && profitData.days.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                        <tr>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-right">Début (RUB)</th>
                          <th className="px-4 py-2 text-right">Fin (RUB)</th>
                          <th className="px-4 py-2 text-right">Profit (RUB)</th>
                          <th className="px-4 py-2 text-center">Résultat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {profitData.days.map((day, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-700">{day.date}</td>
                            <td className="px-4 py-2 text-right">{fmt(day.start_balance_rub)}</td>
                            <td className="px-4 py-2 text-right">{fmt(day.end_balance_rub)}</td>
                            <td className={`px-4 py-2 text-right font-medium ${day.profit_rub >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {day.profit_rub !== null ? (day.profit_rub >= 0 ? '+' : '') + fmt(day.profit_rub) : '—'}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {day.profit_rub !== null ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${day.profit_rub >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {day.profit_rub >= 0 ? 'Bénéfice' : 'Perte'}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">Incomplet</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-6">Aucune donnée journalière disponible</p>
                )
              )}
            </div>
          )}
        </>
      )}

      {/* ── Balances actuelles (inchangé) ── */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Balances actuelles (temps réel)</h2>
          {currentBalances?.computed_at && (
            <span className="text-xs text-gray-400">
              Calculé à {new Date(currentBalances.computed_at).toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>

        {balancesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !currentBalances?.agents?.length ? (
          <p className="text-center text-gray-500 py-8 text-sm">Aucune donnée de balance disponible</p>
        ) : (
          <>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total général (RUB)</span>
              <span className="text-xl font-bold text-gray-900">{fmt(currentBalances.grand_total_rub)} ₽</span>
            </div>

            {/* Profit non réalisé du jour */}
            {currentBalances.unrealized_profit_rub !== null && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">Profit non réalisé (aujourd'hui)</span>
                <span className={`text-xl font-bold ${currentBalances.unrealized_profit_rub >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentBalances.unrealized_profit_rub >= 0 ? '+' : ''}{fmt(currentBalances.unrealized_profit_rub)} ₽
                </span>
              </div>
            )}

            <div className="space-y-4">
              {currentBalances.agents.map((agent) => (
                <div key={agent.agent_id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-gray-800 text-sm">{agent.agent_name}</span>
                    <span className="text-sm font-bold text-blue-700">{fmt(agent.total_rub)} ₽</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                          <th className="px-4 py-2 text-left font-medium">Devise</th>
                          <th className="px-4 py-2 text-right font-medium">Montant</th>
                          <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">Taux interne</th>
                          <th className="px-4 py-2 text-right font-medium">≈ RUB</th>
                          <th className="px-4 py-2 text-right font-medium hidden md:table-cell">Mis à jour</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {agent.balances.map((b, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5">
                              <span className="font-semibold text-gray-800">{b.currency}</span>
                              <span className="text-gray-400 ml-1 text-xs">{b.currency_symbol}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-700 font-medium">{fmt(b.amount)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-500 hidden sm:table-cell">
                              {b.rate_internal != null ? fmt(b.rate_internal) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{fmt(b.amount_rub)} ₽</td>
                            <td className="px-4 py-2.5 text-right text-gray-400 text-xs hidden md:table-cell">
                              {b.last_updated ? new Date(b.last_updated).toLocaleTimeString('fr-FR') : '—'}
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