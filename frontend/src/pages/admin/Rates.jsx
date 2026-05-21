import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import {
  RefreshCw,
  Plus,
  Search,
  X,
  Edit,
  Trash2,
  DollarSign,
  ArrowRight,
  Percent,
  Globe,
  BarChart3,
  Activity,
  Filter
} from 'lucide-react';

export default function RatesList() {
  const [rates, setRates] = useState([]);
  const [allRates, setAllRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [countries, setCountries] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currencyFilter, setCurrencyFilter] = useState('all');

  // Détection responsive
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      // ✅ Corrections des routes selon les fichiers backend
      const [ratesRes, countriesRes, currenciesRes] = await Promise.all([
        api.get('/rates'),           // GET /rates (admin) → tous les taux
        api.get('/countries'),       // GET /countries (public) → pays actifs
        api.get('/currencies')       // GET /currencies (public) → devises actives (ou toutes si admin)
      ]);
      
      // Extraction des données
      let ratesData = [];
      if (ratesRes.data && ratesRes.data.success === true) {
        ratesData = ratesRes.data.data || [];
      } else if (Array.isArray(ratesRes.data)) {
        ratesData = ratesRes.data;
      } else if (ratesRes.data && ratesRes.data.data) {
        ratesData = ratesRes.data.data;
      }
      
      let countriesData = [];
      if (countriesRes.data && countriesRes.data.success === true) {
        countriesData = countriesRes.data.data || [];
      } else if (Array.isArray(countriesRes.data)) {
        countriesData = countriesRes.data;
      } else if (countriesRes.data && countriesRes.data.data) {
        countriesData = countriesRes.data.data;
      }
      
      let currenciesData = [];
      if (currenciesRes.data && currenciesRes.data.success === true) {
        currenciesData = currenciesRes.data.data || [];
      } else if (Array.isArray(currenciesRes.data)) {
        currenciesData = currenciesRes.data;
      } else if (currenciesRes.data && currenciesRes.data.data) {
        currenciesData = currenciesRes.data.data;
      }
      
      setAllRates(ratesData);
      setRates(ratesData);
      setCountries(countriesData);
      setCurrencies(currenciesData);
      
      // Calcul local des stats
      const activeCount = ratesData?.filter(rate => rate.is_active)?.length || 0;
      setStats({
        total: ratesData?.length || 0,
        active: activeCount
      });
      
      // ✅ Récupération des stats depuis le backend (route admin)
      try {
        const statsRes = await api.get('/rates/stats');
        if (statsRes.data && statsRes.data.success === true && statsRes.data.data) {
          setStats({
            total: parseInt(statsRes.data.data.total) || 0,
            active: parseInt(statsRes.data.data.active) || 0
          });
        }
      } catch (statsErr) {
        console.warn('Impossible de récupérer les stats officielles', statsErr);
      }
      
    } catch (err) {
      if (err.response?.status === 401) {
        alert('Session expirée, veuillez vous reconnecter');
      } else if (err.response?.status === 403) {
        alert('Accès refusé : vous devez être administrateur');
      } else {
        alert('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchRates(); 
  }, []);

  // Filtrer et trier les taux
  useEffect(() => {
    let filteredRates = allRates;

    if (searchTerm) {
      filteredRates = filteredRates.filter(rate => {
        const searchLower = searchTerm.toLowerCase();
        return (
          rate.from_currency_code?.toLowerCase().includes(searchLower) ||
          rate.to_currency_code?.toLowerCase().includes(searchLower) ||
          rate.from_currency_name?.toLowerCase().includes(searchLower) ||
          rate.to_currency_name?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (currencyFilter !== 'all') {
      filteredRates = filteredRates.filter(rate => {
        return rate.from_currency_code === currencyFilter || rate.to_currency_code === currencyFilter;
      });
    }

    if (sortConfig.key) {
      filteredRates.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setRates(filteredRates);
  }, [searchTerm, allRates, currencyFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const saveRate = async (e) => {
    e.preventDefault();
    try {
      const rateData = {
        from_currency_id: parseInt(modal.rate.from_currency_id),
        to_currency_id: parseInt(modal.rate.to_currency_id),
        rate: parseFloat(modal.rate.rate),
        commission_percent: parseFloat(modal.rate.commission_percent || 0.75)
      };

      if (rateData.from_currency_id === rateData.to_currency_id) {
        alert('Les devises source et cible doivent être différentes');
        return;
      }

      if (rateData.rate <= 0) {
        alert('Le taux doit être supérieur à 0');
        return;
      }

      if (rateData.commission_percent < 0 || rateData.commission_percent > 100) {
        alert('La commission doit être comprise entre 0 et 100');
        return;
      }

      let response;
      if (modal.mode === "add") {
        // ✅ POST /rates (upsert)
        response = await api.post('/rates', rateData);
      } else {
        // ✅ PUT /rates/:id (update)
        response = await api.put(`/rates/${modal.rate.id}`, {
          rate: rateData.rate,
          commission_percent: rateData.commission_percent,
          is_active: modal.rate.is_active
        });
      }
      
      if (response.data && response.data.success === false) {
        throw new Error(response.data.message);
      }
      
      setModal(null);
      fetchRates();
    } catch (err) {
      if (err.response?.data?.message) {
        alert(`Erreur: ${err.response.data.message}`);
      } else if (err.response?.status === 409) {
        alert('Un taux existe déjà pour cette paire de devises');
      } else if (err.response?.status === 503) {
        alert('Système temporairement occupé, veuillez réessayer');
      } else {
        alert("Erreur lors de la sauvegarde du taux");
      }
    }
  };

  const deleteRate = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce taux ?")) return;
    try {
      // ✅ DELETE /rates/:id (soft delete)
      await api.delete(`/rates/${id}`);
      fetchRates();
    } catch (err) {
      if (err.response?.status === 401) {
        alert('Session expirée, veuillez vous reconnecter');
      } else {
        alert("Erreur lors de la suppression du taux");
      }
    }
  };

  const toggleRateStatus = async (rate) => {
    try {
      // ✅ PUT /rates/:id (update avec is_active)
      await api.put(`/rates/${rate.id}`, {
        is_active: !rate.is_active
      });
      fetchRates();
    } catch (err) {
      alert("Erreur lors de la modification du statut");
    }
  };

  // Grouper les taux par devise source
  const groupedRates = rates.reduce((acc, rate) => {
    const fromCurrencyCode = rate.from_currency_code;
    if (!fromCurrencyCode) return acc;
    
    if (!acc[fromCurrencyCode]) {
      acc[fromCurrencyCode] = [];
    }
    acc[fromCurrencyCode].push(rate);
    return acc;
  }, {});

  // Devises uniques pour le filtre
  const availableCurrencies = Array.isArray(currencies) ? currencies.map(c => c.code) : [];
  const uniqueCurrencies = [...new Set([
    ...availableCurrencies, 
    ...allRates.flatMap(rate => [
      rate.from_currency_code, 
      rate.to_currency_code
    ]).filter(Boolean)
  ])];

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* En-tête */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={24} className="text-indigo-600" />
            Gestion des Taux de Change
          </h1>
          <p className="text-sm text-gray-600 mt-1">Configurez et gérez les taux de conversion</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <button
            onClick={fetchRates}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={16} />
            Actualiser
          </button>
          <button
            onClick={() => setModal({ 
              mode: "add", 
              rate: { 
                from_currency_id: "", 
                to_currency_id: "", 
                rate: "", 
                commission_percent: 0.75,
                is_active: true
              } 
            })}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} />
            Ajouter un taux
          </button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par devise ou pays..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-500" />
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">Toutes les devises</option>
              {uniqueCurrencies.map(currency => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </div>
        </div>

        {searchTerm && (
          <p className="text-sm text-gray-500 mt-2">
            {rates.length} taux trouvés pour "{searchTerm}"
          </p>
        )}
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 lg:p-3 rounded-lg bg-blue-100 text-blue-600 mr-3 lg:mr-4">
              <BarChart3 size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total des taux</p>
              <p className="text-xl lg:text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 lg:p-3 rounded-lg bg-green-100 text-green-600 mr-3 lg:mr-4">
              <Activity size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Taux actifs</p>
              <p className="text-xl lg:text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des taux...</p>
        </div>
      ) : rates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <Search size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Aucun taux trouvé</h3>
          <p className="text-gray-500">
            {searchTerm || currencyFilter !== 'all' 
              ? "Essayez de modifier vos critères de recherche" 
              : "Commencez par ajouter votre premier taux"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedRates).map(([currency, currencyRates]) => (
            <div key={currency} className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-semibold text-blue-600 flex items-center gap-2">
                    <Globe size={20} />
                    {currency} ({currencyRates[0]?.from_currency_symbol})
                  </h2>
                  <p className="text-sm text-gray-600">
                    {currencyRates[0]?.from_currency_name}
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {currencyRates.length} taux
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currencyRates.map((rate) => (
                  <div key={rate.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-800 text-sm lg:text-base">
                        {rate.from_currency_code} <ArrowRight size={14} className="inline mx-1" /> {rate.to_currency_code}
                      </h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setModal({ 
                            mode: "edit", 
                            rate: { 
                              ...rate,
                              from_currency_id: rate.from_currency_id,
                              to_currency_id: rate.to_currency_id
                            } 
                          })}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteRate(rate.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Globe size={12} />
                        {rate.from_currency_name} → {rate.to_currency_name}
                      </div>
                    </div>

                    <div className="text-xl lg:text-2xl font-bold text-green-600 mb-2 flex items-center gap-1">
                      <DollarSign size={20} />
                      {parseFloat(rate.rate).toFixed(4)}
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      1 {rate.from_currency_symbol} = {parseFloat(rate.rate).toFixed(4)} {rate.to_currency_symbol}
                    </p>

                    <p className="text-xs text-gray-400 mb-3">
                      Taux inverse: {(1 / parseFloat(rate.rate)).toFixed(4)}
                    </p>

                    <div className="flex items-center justify-between gap-1 text-xs text-gray-500 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Percent size={12} />
                        Commission: {rate.commission_percent}%
                      </div>
                      
                      <button
                        onClick={() => toggleRateStatus(rate)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          rate.is_active 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {rate.is_active ? '✓ Actif' : '✗ Inactif'}
                      </button>
                    </div>
                    
                    <div className="text-xs mt-2 text-gray-400">
                      Créé le: {new Date(rate.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal d'ajout / modification */}
      {modal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {modal.mode === "add" ? "Nouveau taux" : "Modifier taux"}
                </h2>
                <button
                  onClick={() => setModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={saveRate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise source *
                  </label>
                  <select
                    value={modal.rate.from_currency_id || ''}
                    onChange={(e) => setModal({ ...modal, rate: { ...modal.rate, from_currency_id: e.target.value } })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionnez une devise source</option>
                    {Array.isArray(currencies) && currencies.map(currency => (
                      <option key={`from-${currency.id}`} value={currency.id}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Devise cible *
                  </label>
                  <select
                    value={modal.rate.to_currency_id || ''}
                    onChange={(e) => setModal({ ...modal, rate: { ...modal.rate, to_currency_id: e.target.value } })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  >
                    <option value="">Sélectionnez une devise cible</option>
                    {Array.isArray(currencies) && currencies.map(currency => (
                      <option key={`to-${currency.id}`} value={currency.id}>
                        {currency.code} - {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Taux de conversion *
                  </label>
                  <input
                    value={modal.rate.rate}
                    onChange={(e) => setModal({ ...modal, rate: { ...modal.rate, rate: e.target.value } })}
                    placeholder="0.0000"
                    type="number"
                    step="0.0001"
                    min="0"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemple: 1 {modal.rate.from_currency_code || 'EUR'} = ? {modal.rate.to_currency_code || 'XAF'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission (%)
                  </label>
                  <input
                    value={modal.rate.commission_percent}
                    onChange={(e) => setModal({ ...modal, rate: { ...modal.rate, commission_percent: e.target.value } })}
                    placeholder="0.75"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Commission appliquée sur la transaction (0-100%)
                  </p>
                </div>

                {modal.mode === "edit" && (
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={modal.rate.is_active}
                        onChange={(e) => setModal({ ...modal, rate: { ...modal.rate, is_active: e.target.checked } })}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Taux actif</span>
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button 
                    type="button" 
                    onClick={() => setModal(null)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    {modal.mode === "add" ? "Créer" : "Modifier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}