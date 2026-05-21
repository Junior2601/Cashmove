import React, { useEffect, useState, useCallback } from 'react';
import { 
  Plus, Edit, Trash2, RefreshCw, Globe, Phone, Currency, 
  TrendingUp, TrendingDown, Search, Filter, X, CheckCircle, XCircle, Info
} from 'lucide-react';
import api from '../../api/axios';

const getUserRoleFromToken = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
};

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
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 max-w-[90vw] ${styles[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1"><p className="text-sm font-medium">{message}</p></div>
      <button onClick={onClose} className="flex-shrink-0 hover:opacity-70"><X className="w-4 h-4" /></button>
    </div>
  );
};

export default function AdminCountries() {
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  useEffect(() => {
    const role = getUserRoleFromToken();
    setIsAdmin(role === 'admin');
  }, []);

  const fetchCountries = async () => {
    setLoading(true);
    setError(null);
    try {
      const role = getUserRoleFromToken();
      const url = role === 'admin' ? '/countries/all' : '/countries';
      const [countriesRes, statsRes, currenciesRes] = await Promise.all([
        api.get(url),
        api.get('/countries/stats'),
        api.get('/currencies')
      ]);
      setCountries(countriesRes.data?.data || []);
      setStats(statsRes.data?.data || { total: 0, active: 0, inactive: 0 });
      const allCurrencies = currenciesRes.data?.data || [];
      setCurrencies(allCurrencies.filter(c => c.is_active === true));
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Session expirée. Veuillez vous reconnecter.');
        showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
      } else {
        setError('Erreur lors du chargement des données');
        showNotification('Erreur lors du chargement des données', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCountries(); }, []);

  const filteredCountries = countries.filter(country =>
    country.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.phone_prefix?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.currency_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const saveCountry = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const countryData = {
        name: modal.country.name?.trim(),
        code: modal.country.code?.trim().toUpperCase(),
        phone_prefix: modal.country.phone_prefix?.trim(),
        currency_id: parseInt(modal.country.currency_id)
      };
      if (modal.mode === "add") {
        const response = await api.post('/countries', countryData);
        showNotification(response.data?.message || 'Pays créé avec succès', 'success');
      } else {
        const response = await api.put(`/countries/${modal.country.id}`, {
          ...countryData,
          is_active: modal.country.is_active
        });
        showNotification(response.data?.message || 'Pays modifié avec succès', 'success');
      }
      setModal(null);
      await fetchCountries();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la sauvegarde du pays';
      showNotification(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const disableCountry = async (id) => {
    try {
      const response = await api.patch(`/countries/${id}/disable`);
      showNotification(response.data?.message || 'Pays désactivé avec succès', 'success');
      fetchCountries();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Erreur lors de la désactivation', 'error');
    }
  };

  const reactivateCountry = async (id) => {
    try {
      const response = await api.patch(`/countries/${id}/reactivate`);
      showNotification(response.data?.message || 'Pays réactivé avec succès', 'success');
      fetchCountries();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Erreur lors de la réactivation', 'error');
    }
  };

  const deleteCountry = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce pays ?")) return;
    try {
      const response = await api.delete(`/countries/${id}`);
      showNotification(response.data?.message || 'Pays supprimé avec succès', 'success');
      fetchCountries();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const retryLoad = () => {
    showNotification('Rechargement des données...', 'info');
    fetchCountries();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-3 text-gray-600">Chargement des pays...</p>
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
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Gestion des Pays</h1>
          <p className="text-gray-600 text-sm">Administrez les pays et leurs configurations</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p>{error}</p>
            <button onClick={retryLoad} className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
              Réessayer
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Barre de recherche et actions */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher un pays, code, indicatif ou devise..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4" />
                  Filtres
                  {showFilters && <X className="h-4 w-4" />}
                </button>
                <div className="flex gap-2">
                  <button onClick={fetchCountries} className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50" title="Actualiser">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setModal({ mode: "add", country: { name: "", code: "", phone_prefix: "", currency_id: null, is_active: true } })}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">Nouveau Pays</span>
                      <span className="sm:hidden">Nouveau</span>
                    </button>
                  )}
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
                  <div className="p-2 bg-blue-100 rounded-lg"><Globe className="w-5 h-5 text-blue-600" /></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Actifs</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Inactifs</p>
                    <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* Version mobile */}
          <div className="lg:hidden">
            {filteredCountries.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Globe className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">Aucun pays trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredCountries.map((country) => (
                  <div key={country.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg"><Globe className="w-4 h-4 text-blue-600" /></div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{country.name}</h3>
                            <p className="text-gray-500 text-xs">{country.code} • {country.phone_prefix}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Currency className="w-3 h-3" />
                          {country.currency_code ? `${country.currency_code} - ${country.currency_name || ''}` : 'Aucune devise'}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${country.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {country.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          onClick={() => setModal({ mode: "edit", country })}
                          className="flex-1 min-w-[90px] flex items-center justify-center gap-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                        >
                          <Edit size={14} /> Modifier
                        </button>
                        {country.is_active ? (
                          <button
                            onClick={() => disableCountry(country.id)}
                            className="flex-1 min-w-[90px] flex items-center justify-center gap-1 px-3 py-2 text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-50"
                          >
                            <TrendingDown size={14} /> Désactiver
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivateCountry(country.id)}
                            className="flex-1 min-w-[90px] flex items-center justify-center gap-1 px-3 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50"
                          >
                            <TrendingUp size={14} /> Réactiver
                          </button>
                        )}
                        <button
                          onClick={() => deleteCountry(country.id)}
                          className="flex-1 min-w-[90px] flex items-center justify-center gap-1 px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={14} /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Indicatif</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devise</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCountries.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center">
                      <Globe className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-500">Aucun pays trouvé</p>
                    </td>
                  </tr>
                ) : (
                  filteredCountries.map((country) => (
                    <tr key={country.id} className="hover:bg-gray-50 align-middle">
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          {country.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-middle">
                        {country.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          {country.phone_prefix}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Currency className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          {country.currency_code
                            ? `${country.currency_code} (${country.currency_symbol || ''})`
                            : 'Aucune'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap align-middle">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${country.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {country.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap align-middle">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setModal({ mode: "edit", country })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                            >
                              <Edit size={13} /> Modifier
                            </button>
                            {country.is_active ? (
                              <button
                                onClick={() => disableCountry(country.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors"
                              >
                                <TrendingDown size={13} /> Désactiver
                              </button>
                            ) : (
                              <button
                                onClick={() => reactivateCountry(country.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                              >
                                <TrendingUp size={13} /> Réactiver
                              </button>
                            )}
                            <button
                              onClick={() => deleteCountry(country.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
                            >
                              <Trash2 size={13} /> Supprimer
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredCountries.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {filteredCountries.length} pays trouvé{filteredCountries.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'ajout/modification */}
      {modal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center p-4 z-50"
          onClick={(e) => { if (e.target === e.currentTarget && !submitting) setModal(null); }}
        >
          <form onSubmit={saveCountry} className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5" />
                {modal.mode === "add" ? "Nouveau Pays" : "Modifier le Pays"}
              </h2>
              <button
                type="button"
                onClick={() => !submitting && setModal(null)}
                disabled={submitting}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du pays *</label>
                <input
                  value={modal.country.name}
                  onChange={(e) => setModal({ ...modal, country: { ...modal.country, name: e.target.value } })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code ISO (3 lettres) *</label>
                <input
                  value={modal.country.code}
                  onChange={(e) => setModal({ ...modal, country: { ...modal.country, code: e.target.value.toUpperCase().slice(0, 3) } })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase focus:ring-blue-500 focus:border-blue-500"
                  required
                  maxLength={3}
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500 mt-1">Code ISO 3166-1 alpha-3</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Indicatif téléphonique *</label>
                <input
                  value={modal.country.phone_prefix}
                  onChange={(e) => setModal({ ...modal, country: { ...modal.country, phone_prefix: e.target.value } })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise *</label>
                <select
                  value={modal.country.currency_id || ''}
                  onChange={(e) => setModal({ ...modal, country: { ...modal.country, currency_id: e.target.value ? parseInt(e.target.value) : null } })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={submitting}
                >
                  <option value="">Sélectionnez une devise</option>
                  {currencies.map(currency => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
              </div>
              {modal.mode === "edit" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={modal.country.is_active}
                    onChange={(e) => setModal({ ...modal, country: { ...modal.country, is_active: e.target.checked } })}
                    className="rounded border-gray-300 text-blue-600"
                    disabled={submitting}
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">Pays actif</label>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={() => !submitting && setModal(null)}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                {submitting
                  ? <><RefreshCw className="w-4 h-4 animate-spin" />{modal.mode === "add" ? "Création..." : "Modification..."}</>
                  : modal.mode === "add" ? "Créer" : "Modifier"
                }
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}