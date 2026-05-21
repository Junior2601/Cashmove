import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Download, Upload, X, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import api from '../../api/axios';

// Composant de notification (inchangé)
const Notification = ({ message, type, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />
  };

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 4000);
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

// Modal de confirmation (inchangé)
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirmer</button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPayements() {
  const [methods, setMethods] = useState([]);
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [form, setForm] = useState({ 
    id: null, 
    method: "", 
    country_id: "", 
    currency_id: "", 
    is_active: true 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, methodId: null });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const abortControllerRef = useRef(null);

  const cancelPendingRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => cancelPendingRequests();
  }, []);

  // Charger tous les moyens de paiement (admin) – URL corrigée
  const fetchMethods = async () => {
    cancelPendingRequests();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await api.get('/payment-methods', {  // ← correction
        signal: abortController.signal,
        timeout: 30000
      });
      
      // Structure standard { success, data }
      let methodsData = [];
      if (res.data && Array.isArray(res.data.data)) {
        methodsData = res.data.data;
      } else if (Array.isArray(res.data)) {
        methodsData = res.data;
      } else if (res.data && Array.isArray(res.data.payment_methods)) {
        methodsData = res.data.payment_methods;
      }
      
      setMethods(methodsData);
    } catch (err) {
      if (err.code !== 'ERR_CANCELED' && err.name !== 'CanceledError') {
        console.error('API Error:', err);
        showNotification('Erreur lors du chargement des moyens de paiement', 'error');
      }
    } finally {
      setLoading(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  // Charger les pays – URL corrigée
  const fetchCountries = async () => {
    try {
      const res = await api.get('/countries');  // ← correction
      let countriesData = [];
      if (Array.isArray(res.data)) {
        countriesData = res.data;
      } else if (res.data && Array.isArray(res.data.countries)) {
        countriesData = res.data.countries;
      } else if (res.data && Array.isArray(res.data.data)) {
        countriesData = res.data.data;
      }
      setCountries(countriesData);
    } catch (err) {
      console.error('Error fetching countries:', err);
      showNotification('Erreur lors du chargement des pays', 'error');
    }
  };

  // Charger les devises – URL corrigée
  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/currencies');  // ← correction
      let currenciesData = [];
      if (Array.isArray(res.data)) {
        currenciesData = res.data;
      } else if (res.data && Array.isArray(res.data.currencies)) {
        currenciesData = res.data.currencies;
      } else if (res.data && Array.isArray(res.data.data)) {
        currenciesData = res.data.data;
      }
      setCurrencies(currenciesData);
    } catch (err) {
      console.error('Error fetching currencies:', err);
      showNotification('Erreur lors du chargement des devises', 'error');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMethods(),
        fetchCountries(),
        fetchCurrencies()
      ]);
    };
    loadData();
  }, []);

  // Filtrer les méthodes
  const filteredMethods = methods.filter(method => {
    const countryName = countries.find(c => c.id === method.country_id)?.name || 
                        method.country?.name || 
                        method.country_name || "";
    const currencyName = currencies.find(c => c.id === method.currency_id)?.name || 
                         method.currency?.name || 
                         method.currency_name || "";
    
    const matchesSearch = method.method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         currencyName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && method.is_active) ||
                         (statusFilter === "inactive" && !method.is_active);
    return matchesSearch && matchesStatus;
  });

  // Ajouter ou modifier un moyen – URLs corrigées
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.method || !form.country_id || !form.currency_id) {
      showNotification("Veuillez remplir tous les champs obligatoires", 'error');
      return;
    }

    try {
      if (form.id) {
        // Mise à jour
        await api.put(`/payment-methods/${form.id}`, {
          method: form.method,
          currency_id: parseInt(form.currency_id),
          is_active: form.is_active
          // country_id n'est pas envoyé car le select est désactivé en édition,
          // le backend conservera la valeur existante.
        });
        showNotification('Moyen de paiement modifié avec succès', 'success');
      } else {
        // Création
        await api.post('/payment-methods', {
          method: form.method,
          country_id: parseInt(form.country_id),
          currency_id: parseInt(form.currency_id),
          is_active: form.is_active
        });
        showNotification('Moyen de paiement créé avec succès', 'success');
      }

      setForm({ id: null, method: "", country_id: "", currency_id: "", is_active: true });
      setIsEditing(false);
      setShowForm(false);
      await fetchMethods();
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erreur lors de l\'enregistrement';
      showNotification(errorMessage, 'error');
    }
  };

  // Basculer le statut – utilisation des routes /disable et /reactivate
  const toggleStatus = async (method) => {
    try {
      const newStatus = !method.is_active;
      const endpoint = newStatus ? 'reactivate' : 'disable';
      await api.patch(`/payment-methods/${method.id}/${endpoint}`);
      showNotification(`Moyen de paiement ${newStatus ? 'activé' : 'désactivé'} avec succès`, 'success');
      await fetchMethods();
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Erreur lors du changement de statut';
      showNotification(errorMessage, 'error');
    }
  };

  // Supprimer un moyen – URL corrigée
  const handleDelete = async (id) => {
    try {
      await api.delete(`/payment-methods/${id}`);
      showNotification('Moyen de paiement supprimé avec succès', 'success');
      await fetchMethods();
      setConfirmModal({ isOpen: false, methodId: null });
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
      setConfirmModal({ isOpen: false, methodId: null });
    }
  };

  // Préparer la modification
  const handleEdit = (m) => {
    setForm({
      id: m.id,
      method: m.method,
      country_id: m.country_id,
      currency_id: m.currency_id,
      is_active: m.is_active
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleCancel = () => {
    setForm({ id: null, method: "", country_id: "", currency_id: "", is_active: true });
    setIsEditing(false);
    setShowForm(false);
  };

  const getCountryName = (countryId, method) => {
    if (method?.country?.name) return method.country.name;
    if (method?.country_name) return method.country_name;
    const country = countries.find(c => c.id === countryId);
    return country ? country.name : "Pays inconnu";
  };

  const getCurrencyName = (currencyId, method) => {
    if (method?.currency?.name) {
      const currency = method.currency;
      return `${currency.name} (${currency.code})`;
    }
    if (method?.currency_name) return method.currency_name;
    const currency = currencies.find(c => c.id === currencyId);
    return currency ? `${currency.name} (${currency.code})` : "Devise inconnue";
  };

  // Skeleton loading (inchangé)
  if (loading && methods.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4">
              <div className="h-10 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {notification && (
          <div className="fixed inset-x-0 top-4 z-50 px-4">
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, methodId: null })}
          onConfirm={() => handleDelete(confirmModal.methodId)}
          title="Confirmer la suppression"
          message="Êtes-vous sûr de vouloir supprimer ce moyen de paiement ? Cette action est irréversible."
        />

        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Moyens de Paiement</h1>
          <p className="text-gray-600 text-sm">Gérez les moyens de paiement par pays et devise</p>
        </div>

        {/* Bouton d'action principal mobile */}
        <div className="lg:hidden mb-4">
          <button
            onClick={() => {
              handleCancel();
              setShowForm(true);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Ajouter un moyen
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* En-tête avec recherche/filtres (inchangé) */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, pays ou devise..."
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
                    onClick={() => showNotification('Fonctionnalité d\'export à venir', 'info')}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => showNotification('Fonctionnalité d\'import à venir', 'info')}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="active">Actifs</option>
                      <option value="inactive">Inactifs</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Formulaire (inchangé) */}
          {(showForm || !isMobile) && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              {isMobile && (
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">
                    {isEditing ? "Modifier" : "Nouveau moyen"}
                  </h3>
                  <button onClick={handleCancel} className="p-1 text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du moyen de paiement *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Mobile Money, Carte Bancaire"
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pays *</label>
                    <select
                      value={form.country_id}
                      onChange={(e) => setForm({ ...form, country_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                      disabled={isEditing}
                    >
                      <option value="">Sélectionnez un pays</option>
                      {countries.map(country => (
                        <option key={country.id} value={country.id}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                    {isEditing && (
                      <p className="text-xs text-gray-500 mt-1">Le pays ne peut pas être modifié</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Devise *</label>
                    <select
                      value={form.currency_id}
                      onChange={(e) => setForm({ ...form, currency_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    >
                      <option value="">Sélectionnez une devise</option>
                      {currencies.map(currency => (
                        <option key={currency.id} value={currency.id}>
                          {currency.name} ({currency.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select
                    value={form.is_active ? "true" : "false"}
                    onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="true">Actif</option>
                    <option value="false">Inactif</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
                      isEditing 
                        ? "bg-orange-600 hover:bg-orange-700" 
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isEditing ? <Edit size={16} /> : <Plus size={16} />}
                    {isEditing ? "Modifier" : "Ajouter"}
                  </button>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Liste mobile (inchangé sauf toggleStatus utilise désormais la bonne route) */}
          {isMobile && (
            <div className="lg:hidden">
              {filteredMethods.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="text-gray-400 mb-3">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-base">Aucun moyen de paiement trouvé</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchTerm || statusFilter !== "all" 
                      ? "Modifiez vos critères de recherche" 
                      : "Ajoutez un nouveau moyen de paiement"
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredMethods.map((method) => (
                    <div key={method.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-base mb-1">{method.method}</h3>
                          <div className="space-y-1 text-sm text-gray-500">
                            <p>Pays: {getCountryName(method.country_id, method)}</p>
                            <p>Devise: {getCurrencyName(method.currency_id, method)}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            method.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {method.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => toggleStatus(method)}
                          className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                            method.is_active
                              ? "text-orange-600 border border-orange-600 hover:bg-orange-50"
                              : "text-green-600 border border-green-600 hover:bg-green-50"
                          }`}
                        >
                          {method.is_active ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          onClick={() => handleEdit(method)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                        >
                          <Edit size={14} />
                          Modifier
                        </button>
                        <button
                          onClick={() => setConfirmModal({ isOpen: true, methodId: method.id })}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tableau desktop (inchangé) */}
          {!isMobile && (
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méthode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pays</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devise</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMethods.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-base font-medium text-gray-500">Aucun moyen de paiement trouvé</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {searchTerm || statusFilter !== "all" ? "Modifiez vos critères de recherche" : "Ajoutez un nouveau moyen de paiement"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMethods.map((method) => (
                      <tr key={method.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{method.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{method.method}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCountryName(method.country_id, method)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getCurrencyName(method.currency_id, method)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            method.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {method.is_active ? "Actif" : "Inactif"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleStatus(method)}
                              className={`transition-colors flex items-center gap-1 ${
                                method.is_active ? "text-orange-600 hover:text-orange-900" : "text-green-600 hover:text-green-900"
                              }`}
                            >
                              {method.is_active ? "Désactiver" : "Activer"}
                            </button>
                            <button
                              onClick={() => handleEdit(method)}
                              className="text-blue-600 hover:text-blue-900 transition-colors flex items-center gap-1"
                            >
                              <Edit size={16} />
                              Modifier
                            </button>
                            <button
                              onClick={() => setConfirmModal({ isOpen: true, methodId: method.id })}
                              className="text-red-600 hover:text-red-900 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={16} />
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {filteredMethods.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {filteredMethods.length} moyen{filteredMethods.length > 1 ? 's' : ''} de paiement
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}