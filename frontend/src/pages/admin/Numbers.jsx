import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  User, 
  Globe, 
  CreditCard,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  X,
  CheckCircle,
  XCircle,
  Info,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

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
      if (onClose) onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 max-w-[90vw] ${styles[type]}`}>
      <div className="flex-shrink-0">
        {icons[type]}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Modal de confirmation
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminNumbers() {
  const [numbers, setNumbers] = useState([]);
  const [countries, setCountries] = useState([]);
  const [agents, setAgents] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, numberId: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('number');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notification, setNotification] = useState(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const abortControllerRef = useRef(null);

  // Annuler les requêtes en cours
  const cancelPendingRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Afficher une notification
  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  // Détection mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Nettoyage
  useEffect(() => {
    return () => {
      cancelPendingRequests();
    };
  }, []);

  // Charger les numéros autorisés
  const fetchNumbers = async () => {
    cancelPendingRequests();
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLoading(true);
    try {
      const res = await api.get('/authorized_numbers', {
        signal: abortController.signal,
        timeout: 30000
      });
      
      let numbersData = [];
      if (Array.isArray(res.data)) {
        numbersData = res.data;
      } else if (res.data && Array.isArray(res.data.numbers)) {
        numbersData = res.data.numbers;
      } else if (res.data && Array.isArray(res.data.data)) {
        numbersData = res.data.data;
      }
      
      // Adapter les noms de champs (API utilise country_name et payment_method_name)
      const adaptedNumbers = numbersData.map(num => ({
        ...num,
        country: num.country_name,
        payment_method: num.payment_method_name
      }));
      
      setNumbers(adaptedNumbers);
      
      // Calculer les stats
      const total = adaptedNumbers.length;
      const active = adaptedNumbers.filter(n => n.is_active === true).length;
      const inactive = adaptedNumbers.filter(n => n.is_active === false).length;
      setStats({ total, active, inactive });
      
    } catch (err) {
      if (err.code !== 'ERR_CANCELED' && err.name !== 'CanceledError') {
        console.error('API Error:', err);
        setNumbers([]);
        if (err.code === 'ECONNABORTED') {
          showNotification('La requête a pris trop de temps. Veuillez réessayer.', 'error');
        } else {
          showNotification('Erreur lors du chargement des numéros', 'error');
        }
      }
    } finally {
      setLoading(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  };

  // Charger tous les pays (admin)
  const fetchCountries = async () => {
    try {
      const res = await api.get('/countries/all');
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

  // Charger tous les agents (admin)
  const fetchAgents = async () => {
    try {
      const res = await api.get('/agents/admin/all');
      let agentsData = [];
      
      if (Array.isArray(res.data)) {
        agentsData = res.data;
      } else if (res.data && Array.isArray(res.data.agents)) {
        agentsData = res.data.agents;
      } else if (res.data && Array.isArray(res.data.data)) {
        agentsData = res.data.data;
      }
      
      setAgents(agentsData);
    } catch (err) {
      console.error('Error fetching agents:', err);
      showNotification('Erreur lors du chargement des agents', 'error');
    }
  };

  // Charger toutes les méthodes de paiement (admin)
  const fetchPaymentMethods = async () => {
    try {
      const res = await api.get('/payment-methods');
      let methodsData = [];
      
      if (Array.isArray(res.data)) {
        methodsData = res.data;
      } else if (res.data && Array.isArray(res.data.methods)) {
        methodsData = res.data.methods;
      } else if (res.data && Array.isArray(res.data.data)) {
        methodsData = res.data.data;
      }
      
      setPaymentMethods(methodsData);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      showNotification('Erreur lors du chargement des moyens de paiement', 'error');
    }
  };

  useEffect(() => {
    fetchNumbers();
    fetchCountries();
    fetchAgents();
    fetchPaymentMethods();
  }, []);

  // Sauvegarder un numéro
  const saveNumber = async (e) => {
    e.preventDefault();
    
    if (!modal.number.number.trim()) {
      showNotification("Le numéro est requis", 'error');
      return;
    }
    if (!modal.number.agent_id) {
      showNotification("Veuillez sélectionner un agent", 'error');
      return;
    }
    if (!modal.number.country_id) {
      showNotification("Veuillez sélectionner un pays", 'error');
      return;
    }
    if (!modal.number.payment_method_id) {
      showNotification("Veuillez sélectionner un moyen de paiement", 'error');
      return;
    }

    try {
      if (modal.mode === "add") {
        await api.post('/authorized_numbers', {
          number: modal.number.number.trim(),
          agent_id: parseInt(modal.number.agent_id),
          country_id: parseInt(modal.number.country_id),
          payment_method_id: parseInt(modal.number.payment_method_id),
          label: modal.number.label?.trim() || "",
          is_active: modal.number.is_active
        });
        showNotification('Numéro ajouté avec succès', 'success');
      } else {
        await api.put(`/authorized_numbers/${modal.number.id}`, {
          number: modal.number.number.trim(),
          agent_id: parseInt(modal.number.agent_id),
          country_id: parseInt(modal.number.country_id),
          payment_method_id: parseInt(modal.number.payment_method_id),
          label: modal.number.label?.trim() || "",
          is_active: modal.number.is_active
        });
        showNotification('Numéro modifié avec succès', 'success');
      }
      setModal(null);
      await fetchNumbers();
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Erreur lors de la sauvegarde';
      showNotification(errorMessage, 'error');
    }
  };

  // Supprimer un numéro
  const deleteNumber = async (id) => {
    try {
      await api.delete(`/authorized_numbers/${id}`);
      showNotification('Numéro supprimé avec succès', 'success');
      await fetchNumbers();
      setConfirmModal({ isOpen: false, numberId: null });
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
      setConfirmModal({ isOpen: false, numberId: null });
    }
  };

  // Obtenir l'indicatif du pays
  const getCountryPrefix = (countryId) => {
    const country = countries.find(c => c.id === parseInt(countryId));
    return country ? country.phone_prefix : "";
  };

  // Filtrer et trier
  const filteredNumbers = numbers
    .filter(num => {
      const matchesSearch = 
        num.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        num.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        num.country?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        num.payment_method?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        num.label?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={16} className="opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Actif' : 'Inactif'}
      </span>
    );
  };

  // Skeleton loading
  if (loading && numbers.length === 0) {
    return (
      <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <StatsSkeleton />
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <DesktopTableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {/* Notification */}
      {notification && (
        <div className="fixed inset-x-0 top-4 z-50 px-4">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}

      {/* Modal de confirmation */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, numberId: null })}
        onConfirm={() => deleteNumber(confirmModal.numberId)}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer ce numéro autorisé ? Cette action est irréversible."
      />

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Numéros Autorisés</h1>
          <p className="text-xs lg:text-sm text-gray-600">Gérez les numéros de compte autorisés pour les transactions</p>
        </div>
        <button
          onClick={() => setModal({ 
            mode: "add", 
            number: { 
              number: "", 
              country_id: "", 
              agent_id: "",
              payment_method_id: "",
              label: "",
              is_active: true 
            } 
          })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center shadow-sm text-sm lg:text-base w-full sm:w-auto transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Ajouter un numéro
        </button>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 lg:p-3 rounded-lg bg-indigo-100 text-indigo-600 mr-3 lg:mr-4">
              <Phone size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total numéros</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 lg:p-3 rounded-lg bg-green-100 text-green-600 mr-3 lg:mr-4">
              <CheckCircle size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">Actifs</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-2 lg:p-3 rounded-lg bg-red-100 text-red-600 mr-3 lg:mr-4">
              <XCircle size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">Inactifs</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.inactive}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-lg lg:rounded-xl shadow-sm p-3 lg:p-4 mb-4 lg:mb-6 border border-gray-100">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un numéro, agent, pays ou moyen de paiement..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => fetchNumbers()}
              className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm lg:text-base transition-colors"
            >
              <RefreshCw size={16} />
              <span>Actualiser</span>
            </button>
            <button 
              onClick={() => showNotification('Fonctionnalité d\'export à venir', 'info')}
              className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm lg:text-base transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Liste des numéros - Version mobile */}
      {isMobile ? (
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm overflow-hidden border border-gray-100">
          {filteredNumbers.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredNumbers.map((num) => (
                <div key={num.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                        <Phone size={16} />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{num.number}</div>
                        {num.label && <div className="text-xs text-gray-500">{num.label}</div>}
                      </div>
                    </div>
                    {getStatusBadge(num.is_active)}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                      <User size={14} className="mr-2 text-gray-400" />
                      <span>{num.agent_name || 'Agent inconnu'}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-700">
                      <Globe size={14} className="mr-2 text-gray-400" />
                      <span>{num.country || 'Pays inconnu'}</span>
                    </div>

                    <div className="flex items-center text-gray-700">
                      <CreditCard size={14} className="mr-2 text-gray-400" />
                      <span>{num.payment_method || 'Méthode inconnue'}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => setModal({ mode: "edit", number: { ...num } })}
                      className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50 transition-colors"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => setConfirmModal({ isOpen: true, numberId: num.id })}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Phone size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-base font-medium text-gray-500">Aucun numéro trouvé</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm
                  ? "Modifiez vos critères de recherche" 
                  : "Commencez par ajouter un nouveau numéro"}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Version desktop */
        <div className="bg-white rounded-lg lg:rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('number')}
                  >
                    <div className="flex items-center gap-1">
                      Numéro
                      <SortIcon field="number" />
                    </div>
                  </th>
                  <th 
                    className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('label')}
                  >
                    <div className="flex items-center gap-1">
                      Libellé
                      <SortIcon field="label" />
                    </div>
                  </th>
                  <th 
                    className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('agent_name')}
                  >
                    <div className="flex items-center gap-1">
                      Agent
                      <SortIcon field="agent_name" />
                    </div>
                  </th>
                  <th 
                    className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('country')}
                  >
                    <div className="flex items-center gap-1">
                      Pays
                      <SortIcon field="country" />
                    </div>
                  </th>
                  <th 
                    className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('payment_method')}
                  >
                    <div className="flex items-center gap-1">
                      Moyen de paiement
                      <SortIcon field="payment_method" />
                    </div>
                  </th>
                  <th 
                    className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('is_active')}
                  >
                    <div className="flex items-center gap-1">
                      Statut
                      <SortIcon field="is_active" />
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredNumbers.length > 0 ? (
                  filteredNumbers.map((num) => (
                    <tr key={num.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm font-medium text-gray-900">
                          <Phone size={14} className="mr-2 text-gray-400" />
                          {num.number}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {num.label || '-'}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-700">
                          <User size={14} className="mr-2 text-gray-400" />
                          {num.agent_name || 'Agent inconnu'}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-700">
                          <Globe size={14} className="mr-2 text-gray-400" />
                          {num.country || 'Pays inconnu'}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-700">
                          <CreditCard size={14} className="mr-2 text-gray-400" />
                          {num.payment_method || 'Méthode inconnue'}
                        </div>
                       </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(num.is_active)}
                       </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setModal({ mode: "edit", number: { ...num } })}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, numberId: num.id })}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                       </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Phone size={32} className="text-gray-300 mb-2" />
                        <p className="text-base font-medium text-gray-500">Aucun numéro trouvé</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {searchTerm
                            ? "Essayez de modifier vos critères de recherche" 
                            : "Commencez par ajouter votre premier numéro"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal d'ajout/modification */}
      {modal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="bg-white p-4 lg:p-6 rounded-lg lg:rounded-xl shadow-lg w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setModal(null)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-lg lg:text-xl font-semibold mb-4 flex items-center">
              <Phone size={18} className="mr-2" />
              {modal.mode === "add" ? "Ajouter un numéro" : "Modifier le numéro"}
            </h2>
            
            <form onSubmit={saveNumber} className="space-y-3 lg:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays *</label>
                <select
                  value={modal.number.country_id || ''}
                  onChange={(e) => setModal({ 
                    ...modal, 
                    number: { 
                      ...modal.number, 
                      country_id: e.target.value,
                      agent_id: "" // Réinitialiser l'agent
                    } 
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 lg:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
                  required
                >
                  <option value="">Sélectionnez un pays</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name} ({country.code}) - {country.phone_prefix}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro *
                  {modal.number.country_id && (
                    <span className="text-green-600 ml-1">
                      (Indicatif: {getCountryPrefix(modal.number.country_id)})
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder={modal.number.country_id ? "123456789" : "Sélectionnez d'abord un pays"}
                  value={modal.number.number}
                  onChange={(e) => {
                    let value = e.target.value;
                    const prefix = getCountryPrefix(modal.number.country_id);
                    if (prefix && value && !value.startsWith(prefix)) {
                      value = prefix + value.replace(/^\+\d+\s?/, '');
                    }
                    setModal({ ...modal, number: { ...modal.number, number: value } });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 lg:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
                  required
                  disabled={!modal.number.country_id}
                />
                {modal.number.country_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Le numéro commencera automatiquement par {getCountryPrefix(modal.number.country_id)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agent *</label>
                <select
                  value={modal.number.agent_id || ''}
                  onChange={(e) => setModal({ ...modal, number: { ...modal.number, agent_id: e.target.value } })}
                  className="w-full border border-gray-300 rounded-lg px-3 lg:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
                  required
                >
                  <option value="">Sélectionnez un agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moyen de paiement *</label>
                <select
                  value={modal.number.payment_method_id || ''}
                  onChange={(e) => setModal({ ...modal, number: { ...modal.number, payment_method_id: e.target.value } })}
                  className="w-full border border-gray-300 rounded-lg px-3 lg:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
                  required
                >
                  <option value="">Sélectionnez un moyen</option>
                  {paymentMethods.map(method => (
                    <option key={method.id} value={method.id}>
                      {method.method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Libellé (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Compte principal, Carte perso..."
                  value={modal.number.label || ''}
                  onChange={(e) => setModal({ ...modal, number: { ...modal.number, label: e.target.value } })}
                  className="w-full border border-gray-300 rounded-lg px-3 lg:px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
                />
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={modal.number.is_active}
                    onChange={(e) => setModal({ ...modal, number: { ...modal.number, is_active: e.target.checked } })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Numéro actif</span>
                </label>
              </div>
              
              <div className="flex justify-end gap-2 lg:gap-3 pt-3 lg:pt-4 border-t border-gray-200">
                <button 
                  type="button" 
                  onClick={() => setModal(null)}
                  className="px-3 lg:px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm lg:text-base"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="bg-indigo-600 text-white px-3 lg:px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm lg:text-base"
                >
                  {modal.mode === "add" ? "Ajouter" : "Modifier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Composants skeleton
const StatsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
    {[...Array(3)].map((_, index) => (
      <div key={index} className="bg-white rounded-lg lg:rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100 animate-pulse">
        <div className="flex items-center">
          <div className="p-2 lg:p-3 rounded-lg bg-gray-200 mr-3 lg:mr-4">
            <div className="w-5 h-5 lg:w-6 lg:h-6"></div>
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-6 lg:h-7 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const DesktopTableSkeleton = () => (
  <div className="bg-white rounded-lg lg:rounded-xl shadow-sm overflow-hidden border border-gray-100">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Numéro', 'Libellé', 'Agent', 'Pays', 'Moyen de paiement', 'Statut', 'Actions'].map((header, index) => (
              <th key={index} className="px-4 lg:px-6 py-3 text-left">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...Array(5)].map((_, index) => (
            <tr key={index} className="animate-pulse">
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-40"></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </td>
              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                <div className="flex space-x-2">
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);