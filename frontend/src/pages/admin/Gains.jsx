import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
  Filter, 
  User, 
  Globe,
  X,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../../api/axios';

// ─── Enveloppe commune des modales (identique à Transactions.jsx) ────────────
function ModalShell({ open, onClose, children, maxWidth = "max-w-md" }) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`w-full ${maxWidth} my-auto`} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}

// Composant de notification
const Notification = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed left-1/2 transform -translate-x-1/2 top-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 max-w-[90vw] ${styles[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1"><p className="text-sm font-medium">{message}</p></div>
      <button onClick={onClose} className="flex-shrink-0 hover:opacity-70 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Squelettes de chargement
const StatsSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
    {[...Array(4)].map((_, index) => (
      <div key={`skeleton-stats-${index}`} className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100 animate-pulse">
        <div className="flex items-center">
          <div className="p-2 lg:p-3 rounded-lg bg-gray-200 mr-2 lg:mr-4"><div className="w-4 h-4 lg:w-6 lg:h-6"></div></div>
          <div className="flex-1">
            <div className="h-3 lg:h-4 bg-gray-200 rounded w-3/4 mb-1 lg:mb-2"></div>
            <div className="h-4 lg:h-7 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const MobileCardSkeleton = () => (
  <div className="bg-white rounded-lg lg:rounded-xl shadow-sm overflow-hidden border border-gray-100">
    <div className="divide-y divide-gray-200">
      {[...Array(3)].map((_, index) => (
        <div key={`skeleton-mobile-${index}`} className="p-4 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="ml-3 space-y-2"><div className="h-4 bg-gray-200 rounded w-24"></div><div className="h-3 bg-gray-200 rounded w-16"></div></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DesktopTableSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Agent', 'Devise', 'Total Gains', 'Nb Transactions', 'Commission Moyenne'].map((header, idx) => (
              <th key={`skeleton-header-${idx}`} className="px-4 lg:px-6 py-3 text-left"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...Array(6)].map((_, idx) => (
            <tr key={`skeleton-row-${idx}`} className="animate-pulse">
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="h-8 w-8 lg:h-10 lg:w-10 bg-gray-200 rounded-full"></div><div className="ml-3 space-y-2"><div className="h-4 bg-gray-200 rounded w-32"></div><div className="h-3 bg-gray-200 rounded w-16"></div></div></div></td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function AgentsGains() {
  const [gainsData, setGainsData] = useState([]);
  const [agents, setAgents] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({ agent_id: '', currency_code: '' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showFilters, setShowFilters] = useState(false);

  // Historique mensuel d'un agent (par devise)
  const [historyAgent, setHistoryAgent] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  const getCurrentMonthYear = () => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      monthName: now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    };
  };
  const currentPeriod = getCurrentMonthYear();

  // Récupération des agents actifs (pour admin / semi-admin)
  const fetchAgents = async () => {
    try {
      const res = await api.get('/agents/staff/active');
      let agentsData = [];
      if (res.data?.success && Array.isArray(res.data.data)) agentsData = res.data.data;
      else if (Array.isArray(res.data)) agentsData = res.data;
      setAgents(agentsData);
    } catch (err) {
      console.error('Error fetching agents:', err);
      showNotification('Erreur lors du chargement des agents', 'error');
    }
  };

  // Récupération des devises (route publique)
  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/currencies');
      let currenciesData = [];
      if (res.data?.success && Array.isArray(res.data.data)) currenciesData = res.data.data;
      else if (Array.isArray(res.data)) currenciesData = res.data;
      setCurrencies(currenciesData);
    } catch (err) {
      console.error('Error fetching currencies:', err);
      showNotification('Erreur lors du chargement des devises', 'error');
    }
  };

  // Récupération des gains du mois en cours (via endpoint /gains avec dates)
  const fetchCurrentMonthGains = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const res = await api.get('/gains', {
        params: { start_date: startStr, end_date: endStr, limit: 1000 }
      });

      let gainsList = [];
      if (res.data?.success && res.data.data?.gains && Array.isArray(res.data.data.gains)) {
        gainsList = res.data.data.gains;
      } else if (Array.isArray(res.data)) {
        gainsList = res.data;
      }

      // Regroupement par agent + devise
      const grouped = new Map();
      gainsList.forEach(gain => {
        const key = `${gain.agent_id}-${gain.currency_code}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            agent_id: gain.agent_id,
            agent_name: gain.agent_name,
            currency_code: gain.currency_code,
            total_gains: 0,
            number_of_gains: 0,
            commission_sum: 0,
          });
        }
        const entry = grouped.get(key);
        entry.total_gains += parseFloat(gain.gain_amount);
        entry.number_of_gains += 1;
        entry.commission_sum += parseFloat(gain.commission_percent_applied || 0);
      });

      const transformed = Array.from(grouped.values()).map(entry => ({
        ...entry,
        average_commission_percent: entry.number_of_gains > 0
          ? entry.commission_sum / entry.number_of_gains
          : 0,
        currency_id: entry.currency_code, // pour compatibilité si nécessaire
      }));

      setGainsData(transformed);
    } catch (err) {
      console.error('Error fetching gains:', err);
      if (err.response?.status === 403) {
        showNotification('Accès non autorisé aux données de gains', 'error');
      } else {
        showNotification('Erreur lors du chargement des gains du mois', 'error');
      }
      setGainsData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchCurrencies();
    fetchCurrentMonthGains();
  }, []);

  // Filtrage (agent par id, devise par code)
  const filteredGains = gainsData.filter(item => {
    const matchesAgent = !filters.agent_id || item.agent_id.toString() === filters.agent_id;
    const matchesCurrency = !filters.currency_code || item.currency_code === filters.currency_code;
    return matchesAgent && matchesCurrency;
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ agent_id: '', currency_code: '' });
    setShowFilters(false);
  };

  const refreshData = () => {
    fetchCurrentMonthGains();
  };

  // Ouvre le modal et récupère l'historique mensuel (12 mois) de l'agent, par devise
  const openAgentHistory = async (agentId, agentName) => {
    setHistoryAgent({ id: agentId, name: agentName });
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const res = await api.get(`/gains/agent/${agentId}/monthly`);
      let rows = [];
      if (res.data?.success && Array.isArray(res.data.data)) rows = res.data.data;
      else if (Array.isArray(res.data)) rows = res.data;
      setHistoryData(rows);
    } catch (err) {
      console.error('Error fetching agent history:', err);
      if (err.response?.status === 403) {
        showNotification('Accès non autorisé à l\'historique', 'error');
      } else {
        showNotification('Erreur lors du chargement de l\'historique', 'error');
      }
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeAgentHistory = () => {
    setHistoryAgent(null);
    setHistoryData([]);
  };

  const formatMonthLabel = (monthValue) => {
    // monthValue est un DATE_TRUNC('month') → parseable par Date
    const d = new Date(monthValue);
    if (isNaN(d.getTime())) return monthValue;
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const formatAmount = (amount, currencyCode = 'USD') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatAmountCompact = (amount, currencyCode = 'USD') => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ${currencyCode}`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K ${currencyCode}`;
    return formatAmount(amount, currencyCode);
  };

  const stats = {
    totalGains: filteredGains.reduce((sum, item) => sum + item.total_gains, 0),
    totalTransactions: filteredGains.reduce((sum, item) => sum + item.number_of_gains, 0),
    uniqueAgents: new Set(filteredGains.map(item => item.agent_id)).size,
    uniqueCurrencies: new Set(filteredGains.map(item => item.currency_code)).size
  };

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {notification && (
        <div className="fixed inset-x-0 top-4 z-50 px-4">
          <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Gains des Agents</h1>
          <p className="text-xs lg:text-sm text-gray-600">{currentPeriod.monthName} - Gains du mois en cours</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={refreshData} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors order-2 sm:order-1">
            <RefreshCw size={18} /><span className="text-sm">Actualiser</span>
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors order-1 sm:order-2">
            <Filter size={18} /><span className="text-sm">Filtres</span>{showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button onClick={() => showNotification('Fonctionnalité d\'export à venir', 'info')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors order-3">
            <Download size={18} /><span className="text-sm">Exporter</span>
          </button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-4 mb-4 lg:mb-6 border border-gray-100">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
                <select value={filters.agent_id} onChange={(e) => handleFilterChange('agent_id', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">Tous les agents</option>
                  {agents.map(agent => (<option key={agent.id} value={agent.id}>{agent.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                <select value={filters.currency_code} onChange={(e) => handleFilterChange('currency_code', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">Toutes les devises</option>
                  {currencies.map(currency => (<option key={currency.id} value={currency.code}>{currency.code} - {currency.name}</option>))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={resetFilters} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm">Réinitialiser</button>
              <button onClick={() => setShowFilters(false)} className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Consulter l'historique de n'importe quel agent (même sans gain ce mois) */}
      <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-4 mb-4 lg:mb-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2"><Calendar size={16} className="text-indigo-500" />Historique d'un agent</label>
            <select
              value=""
              onChange={(e) => {
                const selected = agents.find(a => a.id.toString() === e.target.value);
                if (selected) openAgentHistory(selected.id, selected.name);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="">Sélectionner un agent pour voir son historique…</option>
              {agents.map(agent => (<option key={`hist-select-${agent.id}`} value={agent.id}>{agent.name}</option>))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Accès aux 12 derniers mois, par devise — indépendamment des gains du mois en cours.</p>
      </div>

      {/* Statistiques */}
      {loading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100">
            <div className="flex items-center"><div className="p-2 lg:p-3 rounded-lg bg-green-100 text-green-600 mr-2 lg:mr-4"><DollarSign size={isMobile ? 18 : 24} /></div><div><p className="text-xs lg:text-sm font-medium text-gray-600">Total Gains</p><p className="text-lg lg:text-2xl font-bold text-gray-800">{isMobile ? formatAmountCompact(stats.totalGains) : formatAmount(stats.totalGains)}</p></div></div>
          </div>
          <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100">
            <div className="flex items-center"><div className="p-2 lg:p-3 rounded-lg bg-blue-100 text-blue-600 mr-2 lg:mr-4"><TrendingUp size={isMobile ? 18 : 24} /></div><div><p className="text-xs lg:text-sm font-medium text-gray-600">Transactions</p><p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.totalTransactions}</p></div></div>
          </div>
          <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100">
            <div className="flex items-center"><div className="p-2 lg:p-3 rounded-lg bg-purple-100 text-purple-600 mr-2 lg:mr-4"><User size={isMobile ? 18 : 24} /></div><div><p className="text-xs lg:text-sm font-medium text-gray-600">Agents</p><p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.uniqueAgents}</p></div></div>
          </div>
          <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-6 border border-gray-100">
            <div className="flex items-center"><div className="p-2 lg:p-3 rounded-lg bg-orange-100 text-orange-600 mr-2 lg:mr-4"><Globe size={isMobile ? 18 : 24} /></div><div><p className="text-xs lg:text-sm font-medium text-gray-600">Devises</p><p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.uniqueCurrencies}</p></div></div>
          </div>
        </div>
      )}

      {/* Tableau / Cartes */}
      {loading ? (isMobile ? <MobileCardSkeleton /> : <DesktopTableSkeleton />) : (
        <>
          {isMobile ? (
            <div className="bg-white rounded-lg lg:rounded-xl shadow-sm overflow-hidden border border-gray-100">
              {filteredGains.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {filteredGains.map((item, idx) => (
                    <div key={`mobile-gain-${item.agent_id}-${item.currency_code}-${idx}`} onClick={() => openAgentHistory(item.agent_id, item.agent_name)} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center"><div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">{item.agent_name?.charAt(0).toUpperCase() || 'A'}</div><div className="ml-3"><div className="text-sm font-medium text-gray-900">{item.agent_name || 'N/A'}</div><div className="text-xs text-gray-500">ID: {item.agent_id}</div></div></div>
                        <div className="text-right"><div className="text-sm font-semibold text-green-600">{formatAmountCompact(item.total_gains, item.currency_code)}</div><div className="text-xs text-gray-500">{item.number_of_gains} trans.</div></div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-700"><Globe size={14} className="mr-2 text-gray-400 flex-shrink-0" /><span className="truncate">{item.currency_code}</span></div>
                        <div className="flex items-center text-gray-700"><div className="w-4 mr-2 flex justify-center flex-shrink-0"><span className="text-xs text-gray-400">%</span></div><span>Commission: {item.average_commission_percent ? `${(item.average_commission_percent * 100).toFixed(1)}%` : 'N/A'}</span></div>
                        <div className="flex items-center text-indigo-600 pt-1"><Calendar size={14} className="mr-2 flex-shrink-0" /><span className="text-xs font-medium">Voir l'historique</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center"><DollarSign size={32} className="text-gray-300 mx-auto mb-2" /><p className="text-base font-medium text-gray-500">Aucun gain trouvé</p><p className="text-xs text-gray-400 mt-1">{filters.agent_id || filters.currency_code ? "Modifiez vos critères" : "Aucun gain enregistré ce mois"}</p></div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr><th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devise</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gains</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nb Transactions</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission Moyenne</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Historique</th></tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGains.length > 0 ? filteredGains.map((item, idx) => (
                      <tr key={`desktop-gain-${item.agent_id}-${item.currency_code}-${idx}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="flex-shrink-0 h-8 w-8 lg:h-10 lg:w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-sm lg:text-base">{item.agent_name?.charAt(0).toUpperCase() || 'A'}</div><div className="ml-3 lg:ml-4"><div className="text-sm font-medium text-gray-900">{item.agent_name || 'N/A'}</div><div className="text-xs text-gray-500">ID: {item.agent_id}</div></div></div></td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="flex items-center text-sm text-gray-700"><Globe size={16} className="mr-2 text-gray-400" />{item.currency_code}</div></td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatAmount(item.total_gains, item.currency_code)}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.number_of_gains}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.average_commission_percent ? `${(item.average_commission_percent * 100).toFixed(2)}%` : 'N/A'}</td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><button onClick={() => openAgentHistory(item.agent_id, item.agent_name)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"><Calendar size={14} />Voir</button></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="px-6 py-8 text-center"><div className="flex flex-col items-center"><DollarSign size={32} className="text-gray-300 mb-2" /><p className="text-base font-medium text-gray-500">Aucun gain trouvé</p><p className="text-sm text-gray-400 mt-1">{filters.agent_id || filters.currency_code ? "Aucune donnée ne correspond" : "Aucun gain enregistré pour le mois"}</p></div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Résumé par agent (Desktop) */}
      {!loading && !isMobile && Object.keys(filteredGains.reduce((acc, item) => { acc[item.agent_id] = item; return acc; }, {})).length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Résumé par Agent</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(filteredGains.reduce((acc, item) => {
              if (!acc[item.agent_id]) acc[item.agent_id] = { agent_id: item.agent_id, agent_name: item.agent_name, total_gains: 0, number_of_transactions: 0, currencies: new Set() };
              acc[item.agent_id].total_gains += item.total_gains;
              acc[item.agent_id].number_of_transactions += item.number_of_gains;
              acc[item.agent_id].currencies.add(item.currency_code);
              return acc;
            }, {})).map(agentStats => (
              <div key={`summary-${agentStats.agent_id}`} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center mb-4"><div className="flex-shrink-0 h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-lg">{agentStats.agent_name?.charAt(0).toUpperCase() || 'A'}</div><div className="ml-4"><div className="text-base font-medium text-gray-900">{agentStats.agent_name}</div><div className="text-sm text-gray-500">{Array.from(agentStats.currencies).join(', ')}</div></div></div>
                <div className="grid grid-cols-2 gap-4"><div><p className="text-sm text-gray-600">Total Gains</p><p className="text-lg font-bold text-gray-800">{formatAmount(agentStats.total_gains)}</p></div><div><p className="text-sm text-gray-600">Transactions</p><p className="text-lg font-bold text-gray-800">{agentStats.number_of_transactions}</p></div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal historique mensuel par devise — même logique de positionnement que Transactions.jsx */}
      <ModalShell
        open={!!historyAgent}
        onClose={closeAgentHistory}
        maxWidth="max-w-2xl"
      >
        <div className="bg-white w-full rounded-2xl shadow-2xl max-h-[85vh] flex flex-col border border-gray-100">
          {/* En-tête modal */}
          <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-11 w-11 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-lg">{historyAgent?.name?.charAt(0).toUpperCase() || 'A'}</div>
              <div className="ml-3">
                <h2 className="text-base lg:text-lg font-semibold text-gray-800">{historyAgent?.name || 'Agent'}</h2>
                <p className="text-xs text-gray-500">Historique des gains (12 derniers mois)</p>
              </div>
            </div>
            <button onClick={closeAgentHistory} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
          </div>

          {/* Corps modal */}
          <div className="overflow-y-auto p-4 lg:p-6 overscroll-contain">
            {historyLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={`hist-skel-${i}`} className="h-14 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : historyData.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-base font-medium text-gray-500">Aucun historique</p>
                <p className="text-xs text-gray-400 mt-1">Aucun gain enregistré sur les 12 derniers mois</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Regroupement par devise, chaque devise listant ses mois */}
                {Object.values(historyData.reduce((acc, row) => {
                  const code = row.code;
                  if (!acc[code]) acc[code] = { code, symbol: row.symbol, months: [] };
                  acc[code].months.push(row);
                  return acc;
                }, {})).map(group => {
                  const totalDevise = group.months.reduce((s, m) => s + parseFloat(m.total_gain || 0), 0);
                  return (
                    <div key={`hist-cur-${group.code}`}>
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                        <div className="flex items-center text-sm font-semibold text-gray-800"><Globe size={16} className="mr-2 text-indigo-500" />{group.code}</div>
                        <div className="text-sm font-bold text-green-600">{formatAmount(totalDevise, group.code)}</div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {group.months.map((m, i) => (
                          <div key={`hist-${group.code}-${i}`} className="flex items-center justify-between py-2.5">
                            <div className="flex items-center text-sm text-gray-700"><Calendar size={14} className="mr-2 text-gray-400" /><span className="capitalize">{formatMonthLabel(m.month)}</span></div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">{formatAmount(parseFloat(m.total_gain || 0), group.code)}</div>
                              <div className="text-xs text-gray-500">{m.transaction_count} trans.</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
