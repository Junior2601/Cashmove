import React, { useEffect, useState, useCallback, useRef } from 'react';
import api from '../../api/axios';
import { 
  Plus, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX,
  Mail,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Download,
  X,
  Key,
  CheckCircle,
  XCircle,
  Info,
  UserCog
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
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${styles[type]}`}>
      <div className="flex-shrink-0">{icons[type]}</div>
      <div className="flex-1"><p className="text-sm font-medium">{message}</p></div>
      <button onClick={onClose} className="flex-shrink-0 hover:opacity-70"><X className="w-4 h-4" /></button>
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
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Confirmer</button>
        </div>
      </div>
    </div>
  );
};

export default function AdminSemiAdmins() {
  const [semiAdmins, setSemiAdmins] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, semiAdminId: null, action: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notification, setNotification] = useState(null);
  
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const hasInitialFetchRef = useRef(false);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchSemiAdmins = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    setLoading(true);
    
    try {
      const res = await api.get('/semi_admins', {
        signal: abortController.signal
      });
      
      if (abortController.signal.aborted) {
        return;
      }
      
      let semiAdminsData = [];
      
      if (Array.isArray(res.data)) {
        semiAdminsData = res.data;
      } else if (res.data && Array.isArray(res.data.semi_admins)) {
        semiAdminsData = res.data.semi_admins;
      } else if (res.data && Array.isArray(res.data.semiAdmins)) {
        semiAdminsData = res.data.semiAdmins;
      } else if (res.data && Array.isArray(res.data.data)) {
        semiAdminsData = res.data.data;
      }
      
      if (isMountedRef.current) {
        setSemiAdmins(semiAdminsData);
        
        const total = semiAdminsData.length;
        const active = semiAdminsData.filter(sa => sa.is_active === true).length;
        const inactive = semiAdminsData.filter(sa => sa.is_active === false).length;
        
        setStats({ total, active, inactive });
        setLoading(false);
      }
    } catch (err) {
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }
      
      if (isMountedRef.current) {
        setSemiAdmins([]);
        setStats({ total: 0, active: 0, inactive: 0 });
        setLoading(false);
        showNotification('Erreur lors du chargement des gestionnaires', 'error');
      }
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [showNotification]);

  useEffect(() => {
    if (!hasInitialFetchRef.current) {
      hasInitialFetchRef.current = true;
      fetchSemiAdmins();
    }
  }, [fetchSemiAdmins]);

  const saveSemiAdmin = async (e) => {
    e.preventDefault();
    
    if (!modal.semiAdmin.name || !modal.semiAdmin.email) {
      showNotification("Veuillez remplir tous les champs obligatoires.", 'error');
      return;
    }

    if (modal.mode === "add" && !modal.semiAdmin.password) {
      showNotification("Veuillez saisir un mot de passe.", 'error');
      return;
    }

    try {
      if (modal.mode === "add") {
        await api.post('/semi_admins', modal.semiAdmin);
        showNotification('Gestionnaire créé avec succès', 'success');
      } else {
        const updateData = {};
        if (modal.semiAdmin.name !== undefined) updateData.name = modal.semiAdmin.name;
        if (modal.semiAdmin.email !== undefined) updateData.email = modal.semiAdmin.email;
        if (modal.semiAdmin.password) updateData.password = modal.semiAdmin.password;
        // Le statut est modifié via un endpoint dédié (toggleSemiAdminStatus)
        await api.put(`/semi_admins/${modal.semiAdmin.id}`, updateData);
        showNotification('Gestionnaire modifié avec succès', 'success');
      }
      setModal(null);
      setShowPassword(false);
      fetchSemiAdmins();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la sauvegarde';
      showNotification(errorMessage, 'error');
    }
  };

  const deleteSemiAdmin = async (id) => {
    try {
      await api.delete(`/semi_admins/${id}`);
      showNotification('Gestionnaire supprimé avec succès', 'success');
      fetchSemiAdmins();
      setConfirmModal({ isOpen: false, semiAdminId: null, action: null });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la suppression';
      showNotification(errorMessage, 'error');
      setConfirmModal({ isOpen: false, semiAdminId: null, action: null });
    }
  };

  const toggleSemiAdminStatus = async (semiAdmin) => {
    try {
      const newStatus = !semiAdmin.is_active;
      await api.patch(`/semi_admins/${semiAdmin.id}/status`, { is_active: newStatus });
      showNotification(
        newStatus ? 'Gestionnaire activé avec succès' : 'Gestionnaire désactivé avec succès',
        'success'
      );
      fetchSemiAdmins();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erreur lors de la modification du statut';
      showNotification(errorMessage, 'error');
    }
  };

  const getStatusBadge = (semiAdmin) => {
    const isActive = semiAdmin.is_active;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {isActive ? <CheckCircle className="mr-1 text-green-500" size={12} /> : <XCircle className="mr-1 text-red-500" size={12} />}
        {isActive ? 'Actif' : 'Inactif'}
      </span>
    );
  };

  const filteredSemiAdmins = semiAdmins
    .filter(sa => {
      const matchesSearch = (sa.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (sa.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && sa.is_active) ||
                           (statusFilter === 'inactive' && !sa.is_active);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
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

  if (loading) {
    return (
      <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-80 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-44 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100 animate-pulse">
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
        
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Nom', 'Email', 'Statut', 'Actions'].map((h, i) => (
                    <th key={i} className="px-4 lg:px-6 py-3 text-left">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-8 w-8 lg:h-10 lg:w-10 bg-gray-200 rounded-full"></div>
                        <div className="ml-3 lg:ml-4 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4"><div className="h-4 bg-gray-200 rounded w-40"></div></td>
                    <td className="px-4 lg:px-6 py-4"><div className="h-6 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex space-x-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
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
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, semiAdminId: null, action: null })}
        onConfirm={() => confirmModal.action === 'delete' && deleteSemiAdmin(confirmModal.semiAdminId)}
        title="Confirmer la suppression"
        message="Êtes-vous sûr de vouloir supprimer ce gestionnaire ? Cette action est irréversible."
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Gestion des Gestionnaires</h1>
          <p className="text-xs lg:text-sm text-gray-600">Gérez les comptes des gestionnaires (semi-admins)</p>
        </div>
        <button
          onClick={() => setModal({ mode: "add", semiAdmin: { name: "", email: "", password: "", is_active: true } })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center shadow-sm text-sm lg:text-base w-full sm:w-auto transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Ajouter un gestionnaire
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 lg:p-3 rounded-lg bg-indigo-100 text-indigo-600 mr-3 lg:mr-4">
              <UserCog size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">Total gestionnaires</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 lg:p-3 rounded-lg bg-green-100 text-green-600 mr-3 lg:mr-4">
              <UserCheck size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">Actifs</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 lg:p-3 rounded-lg bg-red-100 text-red-600 mr-3 lg:mr-4">
              <UserX size={20} className="lg:w-6 lg:h-6" />
            </div>
            <div>
              <p className="text-xs lg:text-sm font-medium text-gray-600">Inactifs</p>
              <p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.inactive}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4 mb-4 lg:mb-6 border border-gray-100">
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un gestionnaire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Filter size={16} className="text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base w-full"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs seulement</option>
                <option value="inactive">Inactifs seulement</option>
              </select>
            </div>
            <button 
              onClick={() => showNotification('Fonctionnalité d\'export à venir', 'info')}
              className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm lg:text-base"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>
        </div>
      </div>

      {isMobile ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          {filteredSemiAdmins.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredSemiAdmins.map((sa) => (
                <div key={sa.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">
                        {sa.name?.charAt(0).toUpperCase() || 'G'}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{sa.name}</div>
                        <div className="text-xs text-gray-500">ID: {sa.id}</div>
                      </div>
                    </div>
                    {getStatusBadge(sa)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-700">
                      <Mail size={14} className="mr-2 text-gray-400" />
                      <span className="truncate">{sa.email}</span>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => toggleSemiAdminStatus(sa)}
                      className={`p-2 rounded ${sa.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                      title={sa.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {sa.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                    </button>
                    <button
                      onClick={() => setModal({ mode: "edit", semiAdmin: { ...sa, password: "" } })}
                      className="text-yellow-600 hover:bg-yellow-50 p-2 rounded"
                      title="Modifier"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => setConfirmModal({ isOpen: true, semiAdminId: sa.id, action: 'delete' })}
                      className="text-red-600 hover:bg-red-50 p-2 rounded"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <UserCog size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-base font-medium text-gray-500">Aucun gestionnaire trouvé</p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm || statusFilter !== 'all' ? "Modifiez vos critères de recherche" : "Ajoutez votre premier gestionnaire"}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Nom <SortIcon field="name" /></div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}>
                    <div className="flex items-center gap-1">Email <SortIcon field="email" /></div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('is_active')}>
                    <div className="flex items-center gap-1">Statut <SortIcon field="is_active" /></div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSemiAdmins.length > 0 ? (
                  filteredSemiAdmins.map((sa) => (
                    <tr key={sa.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 lg:h-10 lg:w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">
                            {sa.name?.charAt(0).toUpperCase() || 'G'}
                          </div>
                          <div className="ml-3 lg:ml-4">
                            <div className="text-sm font-medium text-gray-900">{sa.name}</div>
                            <div className="text-xs text-gray-500">ID: {sa.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-700">
                          <Mail size={14} className="mr-2 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-xs">{sa.email}</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">{getStatusBadge(sa)}</td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => toggleSemiAdminStatus(sa)}
                            className={`p-2 rounded ${sa.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                            title={sa.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {sa.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>
                          <button
                            onClick={() => setModal({ mode: "edit", semiAdmin: { ...sa, password: "" } })}
                            className="text-yellow-600 hover:bg-yellow-50 p-2 rounded"
                            title="Modifier"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => setConfirmModal({ isOpen: true, semiAdminId: sa.id, action: 'delete' })}
                            className="text-red-600 hover:bg-red-50 p-2 rounded"
                            title="Supprimer"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center">
                      <UserCog size={32} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-base font-medium text-gray-500">Aucun gestionnaire trouvé</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {searchTerm || statusFilter !== 'all' ? "Modifiez vos critères de recherche" : "Ajoutez votre premier gestionnaire"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button 
              onClick={() => { setModal(null); setShowPassword(false); }} 
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg lg:text-xl font-semibold mb-4 flex items-center">
              <UserCog size={18} className="mr-2" />
              {modal.mode === "add" ? "Nouveau gestionnaire" : "Modifier le gestionnaire"}
            </h2>
            <form onSubmit={saveSemiAdmin} className="space-y-3 lg:space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input
                  type="text"
                  value={modal.semiAdmin.name || ''}
                  onChange={(e) => setModal({ ...modal, semiAdmin: { ...modal.semiAdmin, name: e.target.value } })}
                  placeholder="Nom complet"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={modal.semiAdmin.email || ''}
                  onChange={(e) => setModal({ ...modal, semiAdmin: { ...modal.semiAdmin, email: e.target.value } })}
                  placeholder="Adresse email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe {modal.mode === "edit" && "(laisser vide pour ne pas modifier)"} *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={modal.semiAdmin.password || ''}
                    onChange={(e) => setModal({ ...modal, semiAdmin: { ...modal.semiAdmin, password: e.target.value } })}
                    placeholder="Mot de passe"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500"
                    required={modal.mode === "add"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  >
                    <Key size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={modal.semiAdmin.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setModal({ ...modal, semiAdmin: { ...modal.semiAdmin, is_active: e.target.value === 'active' } })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 lg:gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => { setModal(null); setShowPassword(false); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700"
                >
                  {modal.mode === "add" ? "Créer" : "Modifier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}