import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_transactions: 0,
    total_send_amount: 0,
    validated_count: 0,
    completed_count: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [currencyData, setCurrencyData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('week'); // default 'week' as in backend
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Token unifié : l'intercepteur axios utilise 'token'
  const getAuthToken = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
      return null;
    }
    return token;
  }, [navigate]);

  // Données mockées pour le graphique (fallback)
  const getMockChartData = useCallback((period) => {
    const mockData = {
      day: [
        { period: '00:00', count: 12, total_amount: 4500 },
        { period: '04:00', count: 8, total_amount: 3200 },
        { period: '08:00', count: 18, total_amount: 6800 },
        { period: '12:00', count: 22, total_amount: 8900 },
        { period: '16:00', count: 15, total_amount: 5600 },
        { period: '20:00', count: 28, total_amount: 11200 },
      ],
      week: [
        { period: 'Lun', count: 85, total_amount: 32000 },
        { period: 'Mar', count: 72, total_amount: 28000 },
        { period: 'Mer', count: 98, total_amount: 41000 },
        { period: 'Jeu', count: 65, total_amount: 26000 },
        { period: 'Ven', count: 112, total_amount: 45000 },
        { period: 'Sam', count: 44, total_amount: 18000 },
        { period: 'Dim', count: 38, total_amount: 15000 },
      ],
      month: [
        { period: 'Sem 1', count: 85, total_amount: 32000 },
        { period: 'Sem 2', count: 112, total_amount: 45000 },
        { period: 'Sem 3', count: 78, total_amount: 29000 },
        { period: 'Sem 4', count: 95, total_amount: 38000 },
      ]
    };
    return mockData[period] || mockData.week;
  }, []);

  // Données mockées pour la répartition par devise (car endpoint non disponible)
  const getMockCurrencyData = useCallback(() => [
    { name: 'EUR', value: 45000 },
    { name: 'USD', value: 32000 },
    { name: 'XOF', value: 28000 },
    { name: 'GBP', value: 15000 },
    { name: 'CAD', value: 12000 },
  ], []);

  const fetchDashboardData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    setError('');
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // 1. Statistiques globales → GET /transactions/stats
      const statsRes = await api.get('/transactions/stats', config);
      // La réponse backend est { success: true, data: { ... } }
      const statsData = statsRes.data?.data || {};
      setStats({
        total_transactions: statsData.total_transactions || 0,
        total_send_amount: statsData.total_send_amount || 0,
        completed_count: statsData.completed_count || 0,
        validated_count: statsData.validated_count || 0
      });

      // 2. Données du graphique → GET /transactions/chart?period=...
      try {
        const chartRes = await api.get(`/transactions/chart?period=${timeFilter}`, config);
        // Le backend retourne { success: true, data: [...] } avec des objets { period, count, total_amount }
        const rawData = chartRes.data?.data || [];
        if (rawData.length) {
          setChartData(rawData);
        } else {
          setChartData(getMockChartData(timeFilter));
        }
      } catch (chartErr) {
        console.warn('Erreur chargement graphique:', chartErr);
        setChartData(getMockChartData(timeFilter));
      }

      // 3. Transactions récentes → GET /transactions/recent?limit=5
      try {
        const recentRes = await api.get('/transactions/recent?limit=5', config);
        const transactions = recentRes.data?.data || [];
        setRecentTransactions(Array.isArray(transactions) ? transactions : []);
      } catch (recentErr) {
        console.warn('Erreur chargement transactions récentes:', recentErr);
        setRecentTransactions([]);
      }

      // 4. Répartition par devise (endpoint non disponible → fallback mock)
      // Optionnel : on pourrait calculer ces stats à partir des transactions, mais on garde le mock
      setCurrencyData(getMockCurrencyData());

    } catch (err) {
      console.error('Erreur récupération données:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/admin/login');
        return;
      }
      setError('Erreur de chargement des données. Veuillez réessayer.');
      setChartData(getMockChartData(timeFilter));
      setCurrencyData(getMockCurrencyData());
      setStats({
        total_transactions: 0,
        total_send_amount: 0,
        pending_count: 0,
        completed_count: 0
      });
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, timeFilter, navigate, getMockChartData, getMockCurrencyData]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Convertir le filtre (day/week/month) en dates pour l'export
  const getDateRangeFromFilter = (filter) => {
    const to = new Date();
    const from = new Date();
    switch (filter) {
      case 'day':
        from.setDate(to.getDate() - 1);
        break;
      case 'week':
        from.setDate(to.getDate() - 7);
        break;
      case 'month':
        from.setDate(to.getDate() - 30);
        break;
      default:
        from.setDate(to.getDate() - 7);
    }
    // Format ISO YYYY-MM-DD
    const format = (d) => d.toISOString().split('T')[0];
    return { from: format(from), to: format(to) };
  };

  const handleExport = async () => {
    const token = getAuthToken();
    if (!token) return;

    setExportLoading(true);
    try {
      const { from, to } = getDateRangeFromFilter(timeFilter);
      const response = await api.get(`/transactions/export?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${from}_to_${to}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/admin/login');
      } else {
        alert('Erreur lors de l\'exportation');
      }
    } finally {
      setExportLoading(false);
    }
  };

  const successRate = stats.total_transactions > 0 
    ? Math.round((stats.completed_count / stats.total_transactions) * 100) 
    : 0;

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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard Administrateur</h1>
          <p className="text-gray-600 mt-1 lg:mt-2 text-sm lg:text-base">Vue d'ensemble des activités de transfert</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
          <button
            onClick={fetchDashboardData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm lg:text-base"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualiser
          </button>
          
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 text-sm lg:text-base"
          >
            {exportLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Export...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exporter
              </>
            )}
          </button>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-sm">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-800">×</button>
          </div>
        </div>
      )}

      {/* Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {[
          { title: 'Total Transactions', value: stats.total_transactions.toLocaleString('fr-FR'), color: 'blue', icon: '📄', bgColor: 'bg-blue-100', borderColor: 'border-blue-500' },
          { title: 'Transactions Validées', value: stats.completed_count.toLocaleString('fr-FR'), color: 'green', icon: '✅', bgColor: 'bg-green-100', borderColor: 'border-green-500' },
          { title: 'En Attente', value: stats.validated_count.toLocaleString('fr-FR'), color: 'yellow', icon: '⏳', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-500' },
          { title: 'Montant Total', value: `${stats.total_send_amount.toLocaleString('fr-FR')} €`, color: 'purple', icon: '💰', bgColor: 'bg-purple-100', borderColor: 'border-purple-500' }
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

      {/* Taux de réussite */}
      <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg mb-6 lg:mb-8">
        <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4">Taux de Réussite</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-gray-200 rounded-full h-4">
            <div className="bg-green-500 h-4 rounded-full transition-all duration-500" style={{ width: `${successRate}%` }}></div>
          </div>
          <span className="text-lg font-bold text-gray-700">{successRate}%</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">{stats.completed_count} sur {stats.total_transactions} transactions complétées avec succès</p>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
        {/* Graphique d'évolution */}
        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg">
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
                <Tooltip formatter={(value, name) => {
                  if (name === 'total_amount') return `${value.toLocaleString('fr-FR')} €`;
                  return value.toLocaleString('fr-FR');
                }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="count" stroke="#0088FE" name="Transactions" strokeWidth={2} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="total_amount" stroke="#00C49F" name="Montant total" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition par devise (mock) */}
        <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-lg">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 mb-4 lg:mb-6">Répartition par Devise</h2>
          <div className="h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currencyData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {currencyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => new Intl.NumberFormat('fr-FR').format(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap font-medium text-gray-900">
                      <span className="truncate max-w-16 lg:max-w-none block">{transaction.tracking_code}</span>
                    </td>
                    <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap text-gray-900">
                      {new Intl.NumberFormat('fr-FR').format(transaction.send_amount)} {transaction.from_currency_code}
                    </td>
                    <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap text-gray-900 hidden sm:table-cell">
                      {transaction.from_country_name} → {transaction.to_country_name}
                    </td>
                    <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'effectuee' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-2 py-2 lg:px-4 lg:py-4 whitespace-nowrap text-gray-900 hidden md:table-cell">
                      {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
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