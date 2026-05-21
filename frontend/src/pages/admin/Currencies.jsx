import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, Edit, Trash2, RefreshCw, Currency, 
  TrendingUp, TrendingDown, Search, Filter, X, CheckCircle, XCircle, Info,
  DollarSign, Euro, PoundSterling, Bitcoin
} from 'lucide-react';
import api from '../../api/axios';

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
    <div className={`fixed left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 max-w-[90vw] ${styles[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1"><p className="text-sm font-medium">{message}</p></div>
      <button onClick={onClose} className="flex-shrink-0 hover:opacity-70 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Icônes pour les devises courantes
const currencyIcons = {
  USD: <DollarSign className="w-4 h-4" />,
  EUR: <Euro className="w-4 h-4" />,
  GBP: <PoundSterling className="w-4 h-4" />,
  BTC: <Bitcoin className="w-4 h-4" />,
};

const getCurrencyIcon = (currencyCode) => {
  return currencyIcons[currencyCode] || <Currency className="w-4 h-4 text-blue-600" />;
};

export default function AdminCurrencies() {
  const [currencies, setCurrencies] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  // Récupération des devises (route publique)
  const fetchCurrencies = async () => {
    try {
      const response = await api.get('/currencies');
      const currenciesData = response.data?.data || [];
      setCurrencies(currenciesData);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors du chargement des devises';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }
  };

  // Récupération des statistiques (route admin)
  const fetchStats = async () => {
    try {
      const response = await api.get('/currencies/stats');
      const statsData = response.data?.data || { total: 0, active: 0, inactive: 0 };
      setStats({
        total: statsData.total || 0,
        active: statsData.active || 0,
        inactive: statsData.inactive ?? 0, // Si null, on affiche 0
      });
    } catch (err) {
      // Si l'utilisateur n'est pas admin, on peut ignorer l'erreur ou afficher des stats partielles
      console.warn('Impossible de récupérer les statistiques complètes', err);
      // On ne bloque pas l'affichage principal
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchCurrencies(), fetchStats()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const filteredCurrencies = currencies.filter(currency =>
    currency.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.symbol?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Création / modification
  const saveCurrency = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const currencyData = {
        code: modal.currency.code.toUpperCase(),
        name: modal.currency.name,
        symbol: modal.currency.symbol,
        ...(modal.mode === "edit" && { is_active: modal.currency.is_active })
      };

      let response;
      if (modal.mode === "add") {
        response = await api.post('/currencies', currencyData);
      } else {
        response = await api.put(`/currencies/${modal.currency.id}`, currencyData);
      }

      const message = response.data?.message || (modal.mode === "add" ? 'Devise créée avec succès' : 'Devise modifiée avec succès');
      showNotification(message, 'success');
      setModal(null);
      await loadAllData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la sauvegarde';
      showNotification(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Suppression définitive
  const deleteCurrency = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cette devise ?")) return;
    try {
      const response = await api.delete(`/currencies/${id}`);
      const message = response.data?.message || 'Devise supprimée avec succès';
      showNotification(message, 'success');
      await loadAllData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
    }
  };

  // Désactiver (soft delete)
  const disableCurrency = async (id) => {
    try {
      const response = await api.patch(`/currencies/${id}/disable`);
      const message = response.data?.message || 'Devise désactivée';
      showNotification(message, 'success');
      await loadAllData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la désactivation';
      showNotification(errorMessage, 'error');
    }
  };

  // Réactiver
  const reactivateCurrency = async (id) => {
    try {
      const response = await api.patch(`/currencies/${id}/reactivate`);
      const message = response.data?.message || 'Devise réactivée';
      showNotification(message, 'success');
      await loadAllData();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la réactivation';
      showNotification(errorMessage, 'error');
    }
  };

  const handleToggleStatus = (currency) => {
    if (currency.is_active) {
      disableCurrency(currency.id);
    } else {
      reactivateCurrency(currency.id);
    }
  };

  const retryLoad = () => {
    showNotification('Rechargement des données...', 'info');
    loadAllData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Chargement des devises...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {notification && (
        <div className="fixed inset-x-0 top-4 z-50 px-4">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Gestion des Devises</h1>
          <p className="text-gray-600 text-sm">Administrez les devises et leurs configurations</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Erreur</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={retryLoad}
              className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Carte principale */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Barre de recherche / actions */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher une devise, code ou symbole..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Filter className="h-4 w-4" />
                  Filtres
                  {showFilters && <X className="h-4 w-4" />}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={retryLoad}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Actualiser"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setModal({ 
                      mode: "add", 
                      currency: { code: "", name: "", symbol: "", is_active: true } 
                    })}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Nouvelle Devise</span>
                    <span className="sm:hidden">Nouvelle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Currency className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Actives</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Inactives</p>
                    <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vue mobile */}
          <div className="lg:hidden">
            {filteredCurrencies.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="text-gray-400 mb-3">
                  <Currency className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-500 text-base">Aucune devise trouvée</p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm ? "Modifiez vos critères de recherche" : "Commencez par ajouter une nouvelle devise"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredCurrencies.map((currency) => (
                  <div key={currency.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            {getCurrencyIcon(currency.code)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {currency.name}
                            </h3>
                            <p className="text-gray-500 text-xs">
                              {currency.code} • {currency.symbol}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Créé le: {new Date(currency.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        currency.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {currency.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setModal({ mode: "edit", currency })}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        <Edit size={14} /> Modifier
                      </button>
                      <button
                        onClick={() => handleToggleStatus(currency)}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 border rounded-lg transition-colors text-sm ${
                          currency.is_active
                            ? "text-orange-600 border-orange-600 hover:bg-orange-50"
                            : "text-green-600 border-green-600 hover:bg-green-50"
                        }`}
                      >
                        {currency.is_active ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                        {currency.is_active ? "Désactiver" : "Activer"}
                      </button>
                      <button
                        onClick={() => deleteCurrency(currency.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vue desktop (tableau) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbole</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date création</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCurrencies.map((currency) => (
                  <tr key={currency.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg mr-3">
                          {getCurrencyIcon(currency.code)}
                        </div>
                        {currency.code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{currency.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{currency.symbol}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        currency.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {currency.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(currency.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setModal({ mode: "edit", currency })}
                          className="text-blue-600 hover:text-blue-900 transition-colors flex items-center gap-1"
                        >
                          <Edit size={16} /> Modifier
                        </button>
                        <button
                          onClick={() => handleToggleStatus(currency)}
                          className={`hover:text-opacity-80 transition-colors flex items-center gap-1 ${
                            currency.is_active ? "text-orange-600 hover:text-orange-900" : "text-green-600 hover:text-green-900"
                          }`}
                        >
                          {currency.is_active ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                          {currency.is_active ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          onClick={() => deleteCurrency(currency.id)}
                          className="text-red-600 hover:text-red-900 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={16} /> Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCurrencies.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {filteredCurrencies.length} devise{filteredCurrencies.length > 1 ? 's' : ''} trouvée{filteredCurrencies.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'ajout / modification */}
      {modal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setModal(null);
          }}
        >
          <form onSubmit={saveCurrency} className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Currency className="w-5 h-5" />
                {modal.mode === "add" ? "Nouvelle Devise" : "Modifier la Devise"}
              </h2>
              <button type="button" onClick={() => { if (!submitting) setModal(null); }} disabled={submitting} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code ISO *</label>
                <input
                  value={modal.currency.code}
                  onChange={(e) => setModal({ ...modal, currency: { ...modal.currency, code: e.target.value.toUpperCase() } })}
                  placeholder="Ex: USD, EUR, XOF"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 uppercase"
                  required
                  maxLength={10}
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500 mt-1">Code unique (max 10 caractères)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                <input
                  value={modal.currency.name}
                  onChange={(e) => setModal({ ...modal, currency: { ...modal.currency, name: e.target.value } })}
                  placeholder="Ex: Dollar américain"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symbole *</label>
                <input
                  value={modal.currency.symbol}
                  onChange={(e) => setModal({ ...modal, currency: { ...modal.currency, symbol: e.target.value } })}
                  placeholder="Ex: $, €, £"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  required
                  maxLength={5}
                  disabled={submitting}
                />
              </div>
              {modal.mode === "edit" && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={modal.currency.is_active}
                    onChange={(e) => setModal({ ...modal, currency: { ...modal.currency, is_active: e.target.checked } })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    disabled={submitting}
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">Devise active</label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <button type="button" onClick={() => { if (!submitting) setModal(null); }} disabled={submitting} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                {submitting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> {modal.mode === "add" ? "Création..." : "Modification..."}</>
                ) : (modal.mode === "add" ? "Créer" : "Modifier")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}