import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SemiAdminDashboard() {
  const [counts, setCounts] = useState({ pending: 0, completed: 0, cancelled: 0 });
  const [share, setShare] = useState({ percentage: 0, message: '' });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return null;
    }
    return token;
  }, [navigate]);

  const getMockChartData = useCallback((period) => {
    const mockData = {
      day: [
        { period: '00:00', count: 3, total_amount: 1200 },
        { period: '04:00', count: 2, total_amount: 800 },
        { period: '08:00', count: 5, total_amount: 2100 },
        { period: '12:00', count: 7, total_amount: 3400 },
        { period: '16:00', count: 4, total_amount: 1700 },
        { period: '20:00', count: 6, total_amount: 2600 },
      ],
      week: [
        { period: 'Lun', count: 18, total_amount: 7200 },
        { period: 'Mar', count: 14, total_amount: 5600 },
        { period: 'Mer', count: 22, total_amount: 9100 },
        { period: 'Jeu', count: 11, total_amount: 4400 },
        { period: 'Ven', count: 27, total_amount: 10800 },
        { period: 'Sam', count: 9, total_amount: 3600 },
        { period: 'Dim', count: 7, total_amount: 2800 },
      ],
      month: [
        { period: 'Sem 1', count: 42, total_amount: 16800 },
        { period: 'Sem 2', count: 58, total_amount: 23200 },
        { period: 'Sem 3', count: 35, total_amount: 14000 },
        { period: 'Sem 4', count: 47, total_amount: 18800 },
      ],
    };
    return mockData[period] || mockData.week;
  }, []);

  const fetchData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      // 1. Counts (pending, completed, cancelled)
      const countsRes = await api.get('/transactions/semi-admin/stats/counts');
      setCounts(countsRes.data?.data || { pending: 0, completed: 0, cancelled: 0 });

      // 2. Semi-admin share (% transactions traitées)
      try {
        const shareRes = await api.get('/transactions/semi-admin/share');
        setShare(shareRes.data?.data || { percentage: 0, message: '' });
      } catch {
        setShare({ percentage: 0, message: 'Données indisponibles' });
      }

      // 3. Transactions récentes (5 dernières)
      try {
        const recentRes = await api.get('/transactions/semi-admin/recent');
        setRecentTransactions(recentRes.data?.data || []);
      } catch {
        setRecentTransactions([]);
      }

      // 4. Graphique (endpoint admin partagé, accessible semi-admin)
      try {
        const chartRes = await api.get(`/transactions/chart?period=${timeFilter}`);
        const rawData = chartRes.data?.data || [];
        setChartData(rawData.length ? rawData : getMockChartData(timeFilter));
      } catch {
        setChartData(getMockChartData(timeFilter));
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setError('Erreur de chargement des données. Veuillez réessayer.');
      setChartData(getMockChartData(timeFilter));
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, timeFilter, navigate, getMockChartData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = counts.pending + counts.completed + counts.cancelled;
  const completionRate = total > 0 ? Math.round((counts.completed / total) * 100) : 0;
  const sharePercent = Math.min(100, Math.max(0, parseFloat(share.percentage) || 0));

  const statusConfig = {
    effectuee: { label: 'Effectuée', bg: 'bg-green-100', text: 'text-green-800' },
    en_attente: { label: 'En attente', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    validee: { label: 'Validée', bg: 'bg-blue-100', text: 'text-blue-800' },
    annulee: { label: 'Annulée', bg: 'bg-red-100', text: 'text-red-800' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard Semi-Administrateur</h1>
          <p className="text-gray-600 mt-1 lg:mt-2 text-sm lg:text-base">Suivi de vos activités de traitement</p>
        </div>
        <button
          onClick={fetchData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm lg:text-base w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualiser
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-sm">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-800">×</button>
          </div>
        </div>
      )}

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {[
          { title: 'Transactions Effectuées', value: counts.completed.toLocaleString('fr-FR'), icon: '✅', bgColor: 'bg-green-100', borderColor: 'border-green-500' },
          { title: 'En Attente', value: counts.pending.toLocaleString('fr-FR'), icon: '⏳', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-500' },
          { title: 'Annulées', value: counts.cancelled.toLocaleString('fr-FR'), icon: '❌', bgColor: 'bg-red-100', borderColor: 'border-red-500' },
        ].map((card, index) => (
          <div key={index} className={`bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg border-l-4 ${card.borderColor}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs lg:text-sm">{card.title}</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.bgColor} p-2 lg:p-3 rounded-full`}>
                <span className="text-lg lg:text-xl">{card.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barres de progression */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
        {/* Taux de complétion global */}
        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">Taux de Complétion</h2>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-700"
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
            <span className="text-lg font-bold text-gray-700 w-12 text-right">{completionRate}%</span>
          </div>
          <p className="text-sm text-gray-600">
            {counts.completed} transaction{counts.completed > 1 ? 's' : ''} effectuée{counts.completed > 1 ? 's' : ''} sur {total} au total
          </p>
        </div>

        {/* Part personnelle du semi-admin */}
        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">Ma Part de Traitement</h2>
          <div className="flex items-center gap-4 mb-2">
            <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-4 rounded-full transition-all duration-700"
                style={{
                  width: `${sharePercent}%`,
                  background: sharePercent >= 50
                    ? 'linear-gradient(90deg, #3b82f6, #6366f1)'
                    : 'linear-gradient(90deg, #60a5fa, #93c5fd)',
                }}
              ></div>
            </div>
            <span className="text-lg font-bold text-gray-700 w-12 text-right">{sharePercent}%</span>
          </div>
          <p className="text-sm text-gray-600">
            {share.message || `Vous avez traité ${sharePercent}% des transactions effectuées.`}
          </p>
        </div>
      </div>

      {/* Graphique d'évolution */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg mb-6 lg:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Évolution des Transactions</h2>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-xs lg:text-sm w-full sm:w-auto"
          >
            <option value="day">Par Jour</option>
            <option value="week">Par Semaine</option>
            <option value="month">Par Mois</option>
          </select>
        </div>
        <div className="h-64 lg:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" fontSize={12} />
              <YAxis yAxisId="left" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" fontSize={12} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'total_amount') return `${value.toLocaleString('fr-FR')} €`;
                  return value.toLocaleString('fr-FR');
                }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="count" stroke="#0088FE" name="Transactions" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="total_amount" stroke="#00C49F" name="Montant total" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4 lg:mb-6">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Transactions Récentes</h2>
          <span className="text-xs lg:text-sm text-gray-500">Dernières 5 transactions</span>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs lg:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 lg:px-4 lg:py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-2 py-2 lg:px-4 lg:py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-2 py-2 lg:px-4 lg:py-3 text-left font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Route</th>
                  <th className="px-2 py-2 lg:px-4 lg:py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-2 py-2 lg:px-4 lg:py-3 text-left font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((tx) => {
                  const status = statusConfig[tx.status] || { label: tx.status, bg: 'bg-gray-100', text: 'text-gray-800' };
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap font-medium text-gray-900">
                        <span className="truncate max-w-16 lg:max-w-none block">{tx.tracking_code}</span>
                      </td>
                      <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap text-gray-900">
                        {new Intl.NumberFormat('fr-FR').format(tx.send_amount)} {tx.from_currency_code}
                      </td>
                      <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap text-gray-900 hidden sm:table-cell">
                        {tx.from_country_name} → {tx.to_country_name}
                      </td>
                      <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap text-gray-900 hidden md:table-cell">
                        {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 lg:py-12 text-gray-500">
            <svg className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="mt-2 lg:mt-4 text-sm lg:text-base">Aucune transaction pour le moment</p>
          </div>
        )}
      </div>
    </div>
  );
}