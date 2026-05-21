import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  User, 
  UserCheck, 
  UserX,
  Mail,
  Globe,
  Circle,
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
  Shield,
  ShieldCheck,
  ShieldX,
  AlertCircle
} from 'lucide-react';

// Composant de notification (inchangé)
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

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [countries, setCountries] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    validated: 0
  });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, agentId: null, action: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [validationFilter, setValidationFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notification, setNotification] = useState(null);
  const abortControllerRef = useRef(null);

  const cancelPendingRequests = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
  };

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => cancelPendingRequests();
  }, []);

  // Récupération des agents (endpoint /agents)
  const fetchAgents = async () => {
    cancelPendingRequests();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setLoading(true);
    try {
      const res = await api.get('/agents', { signal: abortController.signal, timeout: 30000 });
      // Format attendu : { success: true, data: [...] }
      let agentsData = [];
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        agentsData = res.data.data;
      } else if (Array.isArray(res.data)) {
        agentsData = res.data;
      } else if (res.data && Array.isArray(res.data.agents)) {
        agentsData = res.data.agents;
      }
      setAgents(agentsData);
      // Calcul des stats locales
      const total = agentsData.length;
      const active = agentsData.filter(a => a.is_active === true).length;
      const inactive = agentsData.filter(a => a.is_active === false).length;
      const pending = agentsData.filter(a => a.can_process === false).length;
      const validated = agentsData.filter(a => a.can_process === true).length;
      setStats({ total, active, inactive, pending, validated });
    } catch (err) {
      if (err.code !== 'ERR_CANCELED' && err.name !== 'CanceledError') {
        console.error('API Error:', err);
        setAgents([]);
        showNotification(err.code === 'ECONNABORTED' ? 'Requête trop longue' : 'Erreur lors du chargement des agents', 'error');
      }
    } finally {
      setLoading(false);
      if (abortControllerRef.current === abortController) abortControllerRef.current = null;
    }
  };

  // Récupération des pays (endpoint /countries)
  const fetchCountries = async () => {
    try {
      const res = await api.get('/countries');
      let countriesData = [];
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        countriesData = res.data.data;
      } else if (Array.isArray(res.data)) {
        countriesData = res.data;
      } else if (res.data && Array.isArray(res.data.countries)) {
        countriesData = res.data.countries;
      }
      setCountries(countriesData);
    } catch (err) {
      console.error('Error fetching countries:', err);
      showNotification('Erreur lors du chargement des pays', 'error');
    }
  };

  useEffect(() => {
    fetchAgents();
    fetchCountries();
  }, []);

  // Création / modification d'agent
  const saveAgent = async (e) => {
    e.preventDefault();
    if (!modal.agent.name || !modal.agent.email || !modal.agent.country_id) {
      showNotification("Veuillez remplir tous les champs obligatoires.", 'error');
      return;
    }
    if (modal.mode === "add" && !modal.agent.password) {
      showNotification("Veuillez saisir un mot de passe.", 'error');
      return;
    }

    try {
      const payload = {
        name: modal.agent.name,
        email: modal.agent.email,
        country_id: parseInt(modal.agent.country_id),
        can_process: modal.agent.can_process ?? false,
        is_active: modal.agent.is_active ?? true,
      };
      if (modal.agent.password) payload.password = modal.agent.password;

      if (modal.mode === "add") {
        await api.post('/agents', payload);
        showNotification('Agent créé avec succès', 'success');
      } else {
        await api.put(`/agents/${modal.agent.id}`, payload);
        showNotification('Agent modifié avec succès', 'success');
      }
      setModal(null);
      setShowPassword(false);
      await fetchAgents();
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Erreur lors de la sauvegarde';
      showNotification(errorMessage, 'error');
    }
  };

  // Suppression (soft delete)
  const deleteAgent = async (id) => {
    try {
      await api.delete(`/agents/${id}`);
      showNotification('Agent supprimé avec succès', 'success');
      await fetchAgents();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setConfirmModal({ isOpen: false, agentId: null, action: null });
    }
  };

  // Activation / désactivation (route /status)
  const toggleAgentStatus = async (agent) => {
    try {
      const newStatus = !agent.is_active;
      await api.put(`/agents/${agent.id}/status`, { is_active: newStatus });
      showNotification(`Agent ${newStatus ? 'activé' : 'désactivé'} avec succès`, 'success');
      await fetchAgents();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Erreur lors du changement de statut', 'error');
    }
  };

  // Permission de traitement (route /can-process)
  const toggleCanProcess = async (agent) => {
    try {
      const newValue = !agent.can_process;
      await api.put(`/agents/${agent.id}/can-process`, { can_process: newValue });
      showNotification(`Permission de traitement ${newValue ? 'accordée' : 'retirée'}`, 'success');
      await fetchAgents();
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Erreur lors du changement de permission', 'error');
    }
  };

  // Badge de statut (actif/inactif + validation)
  const getStatusBadge = (agent) => {
    const isActive = agent.is_active;
    const canProcess = agent.can_process;
    let statusColor = '', statusText = '', statusIcon = null;
    if (!canProcess) {
      statusColor = 'bg-yellow-100 text-yellow-800';
      statusText = 'En attente';
      statusIcon = <AlertCircle className="mr-1 text-yellow-500" size={12} />;
    } else if (isActive) {
      statusColor = 'bg-green-100 text-green-800';
      statusText = 'Actif';
      statusIcon = <CheckCircle className="mr-1 text-green-500" size={12} />;
    } else {
      statusColor = 'bg-red-100 text-red-800';
      statusText = 'Inactif';
      statusIcon = <XCircle className="mr-1 text-red-500" size={12} />;
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
        {statusIcon}{statusText}
      </span>
    );
  };

  // Filtres et tri
  const filteredAgents = agents
    .filter(agent => {
      const matchesSearch = agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            agent.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
                            (statusFilter === 'active' && agent.is_active === true) ||
                            (statusFilter === 'inactive' && agent.is_active === false);
      const matchesValidation = validationFilter === 'all' ||
                                (validationFilter === 'validated' && agent.can_process === true) ||
                                (validationFilter === 'pending' && agent.can_process === false);
      return matchesSearch && matchesStatus && matchesValidation;
    })
    .sort((a, b) => {
      let aVal = a[sortField] || '', bVal = b[sortField] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      return sortDirection === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    });

  const handleSort = (field) => {
    setSortField(field);
    setSortDirection(prev => sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
  };

  const SortIcon = ({ field }) => (
    sortField !== field ? <ChevronDown size={16} className="opacity-30" /> :
    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
  );

  // Skeleton (inchangé)
  const StatsSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg lg:rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100 animate-pulse">
          <div className="flex items-center">
            <div className="p-2 lg:p-3 rounded-lg bg-gray-200 mr-3 lg:mr-4"><div className="w-5 h-5 lg:w-6 lg:h-6"></div></div>
            <div className="flex-1"><div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div><div className="h-6 lg:h-7 bg-gray-200 rounded w-1/3"></div></div>
          </div>
        </div>
      ))}
    </div>
  );

  const DesktopTableSkeleton = () => (
    <div className="bg-white rounded-lg lg:rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr>{['Nom', 'Email', 'Pays', 'Statut', 'Validation', 'Actions'].map(h => <th key={h} className="px-4 lg:px-6 py-3"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></th>)}</tr></thead>
          <tbody>{[...Array(5)].map((_, i) => <tr key={i} className="animate-pulse"><td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="h-8 w-8 lg:h-10 lg:w-10 bg-gray-200 rounded-full"></div><div className="ml-3 space-y-2"><div className="h-4 bg-gray-200 rounded w-32"></div><div className="h-3 bg-gray-200 rounded w-16"></div></div></div></td><td><div className="h-4 bg-gray-200 rounded w-40"></div></td><td><div className="h-4 bg-gray-200 rounded w-24"></div></td><td><div className="h-6 bg-gray-200 rounded w-16"></div></td><td><div className="h-6 bg-gray-200 rounded w-16"></div></td><td><div className="flex space-x-2"><div className="h-8 w-8 bg-gray-200 rounded"></div><div className="h-8 w-8 bg-gray-200 rounded"></div><div className="h-8 w-8 bg-gray-200 rounded"></div></div></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );

  if (loading && agents.length === 0) {
    return (
      <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6"><div><div className="h-8 bg-gray-200 rounded w-48 mb-2"></div><div className="h-4 bg-gray-200 rounded w-64"></div></div><div className="h-10 bg-gray-200 rounded w-40"></div></div>
        <StatsSkeleton />
        <div className="bg-white rounded-lg p-4 mb-4"><div className="h-10 bg-gray-200 rounded"></div></div>
        <DesktopTableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      {notification && <div className="fixed inset-x-0 top-4 z-50 px-4"><Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} /></div>}
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ isOpen: false, agentId: null, action: null })} onConfirm={() => confirmModal.action === 'delete' && deleteAgent(confirmModal.agentId)} title="Confirmer la suppression" message="Êtes-vous sûr de vouloir supprimer cet agent ?" />

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div><h1 className="text-xl lg:text-2xl font-bold text-gray-800">Gestion des Agents</h1><p className="text-xs lg:text-sm text-gray-600">Gérez les comptes de vos agents</p></div>
        <button onClick={() => setModal({ mode: "add", agent: { name: "", email: "", password: "", country_id: "", is_active: true, can_process: false } })} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center shadow-sm w-full sm:w-auto"><Plus size={18} className="mr-2" />Ajouter un agent</button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100"><div className="flex items-center"><div className="p-2 lg:p-3 rounded-lg bg-indigo-100 text-indigo-600 mr-3"><User size={20} /></div><div><p className="text-xs lg:text-sm font-medium text-gray-600">Total agents</p><p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.total}</p></div></div></div>
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100"><div className="flex items-center"><div className="p-2 lg:p-3 rounded-lg bg-green-100 text-green-600 mr-3"><UserCheck size={20} /></div><div><p className="text-xs lg:text-sm font-medium text-gray-600">Actifs</p><p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.active}</p></div></div></div>
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100"><div className="flex items-center"><div className="p-2 lg:p-3 rounded-lg bg-red-100 text-red-600 mr-3"><UserX size={20} /></div><div><p className="text-xs lg:text-sm font-medium text-gray-600">Inactifs</p><p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.inactive}</p></div></div></div>
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100"><div className="flex items-center"><div className="p-2 lg:p-3 rounded-lg bg-yellow-100 text-yellow-600 mr-3"><Shield size={20} /></div><div><p className="text-xs lg:text-sm font-medium text-gray-600">En attente</p><p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.pending}</p></div></div></div>
        <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-100"><div className="flex items-center"><div className="p-2 lg:p-3 rounded-lg bg-blue-100 text-blue-600 mr-3"><ShieldCheck size={20} /></div><div><p className="text-xs lg:text-sm font-medium text-gray-600">Validés</p><p className="text-lg lg:text-2xl font-bold text-gray-800">{stats.validated}</p></div></div></div>
      </div>

      {/* Recherche et filtres */}
      <div className="bg-white rounded-lg shadow-sm p-3 lg:p-4 mb-6 border border-gray-100">
        <div className="flex flex-col gap-3">
          <div className="relative"><Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Rechercher un agent..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" /></div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"><option value="all">Tous les statuts</option><option value="active">Actifs</option><option value="inactive">Inactifs</option></select>
            <select value={validationFilter} onChange={e => setValidationFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"><option value="all">Tous</option><option value="validated">Validés</option><option value="pending">En attente</option></select>
            <button onClick={() => showNotification('Export à venir', 'info')} className="flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"><Download size={16} /><span className="hidden sm:inline">Exporter</span></button>
          </div>
        </div>
      </div>

      {/* Liste des agents */}
      {isMobile ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="divide-y divide-gray-200">
            {filteredAgents.map(agent => (
              <div key={agent.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-3"><div className="flex items-center"><div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">{agent.name?.charAt(0).toUpperCase()}</div><div className="ml-3"><div className="text-sm font-medium">{agent.name}</div><div className="text-xs text-gray-500">ID: {agent.id}</div></div></div>{getStatusBadge(agent)}</div>
                <div className="space-y-2 text-sm"><div className="flex items-center text-gray-700"><Mail size={14} className="mr-2 text-gray-400" /><span className="truncate">{agent.email}</span></div><div className="flex items-center text-gray-700"><Globe size={14} className="mr-2 text-gray-400" />{agent.country_name || agent.country || 'Non spécifié'}</div></div>
                <div className="flex justify-end space-x-2 mt-3 pt-3 border-t border-gray-100">
                  <button onClick={() => toggleCanProcess(agent)} className={agent.can_process ? "text-orange-600 hover:bg-orange-50" : "text-blue-600 hover:bg-blue-50"} title={agent.can_process ? "Retirer la validation" : "Valider"}>{agent.can_process ? <ShieldX size={16} /> : <ShieldCheck size={16} />}</button>
                  <button onClick={() => toggleAgentStatus(agent)} className={agent.is_active ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"} title={agent.is_active ? "Désactiver" : "Activer"}>{agent.is_active ? <UserX size={16} /> : <UserCheck size={16} />}</button>
                  <Link to={`/admin/agents/${agent.id}`} className="text-indigo-600 hover:bg-indigo-50"><Eye size={16} /></Link>
                  <button onClick={() => setModal({ mode: "edit", agent: { ...agent, password: "" } })} className="text-yellow-600 hover:bg-yellow-50"><Edit size={16} /></button>
                  <button onClick={() => setConfirmModal({ isOpen: true, agentId: agent.id, action: 'delete' })} className="text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {filteredAgents.length === 0 && <div className="p-8 text-center"><User size={32} className="text-gray-300 mx-auto mb-2" /><p className="font-medium text-gray-500">Aucun agent trouvé</p></div>}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}><div className="flex items-center gap-1">Nom <SortIcon field="name" /></div></th>
                  <th className="px-4 lg:px-6 py-3 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('email')}><div className="flex items-center gap-1">Email <SortIcon field="email" /></div></th>
                  <th className="px-4 lg:px-6 py-3 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('country_name')}><div className="flex items-center gap-1">Pays <SortIcon field="country_name" /></div></th>
                  <th className="px-4 lg:px-6 py-3 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('is_active')}><div className="flex items-center gap-1">Statut <SortIcon field="is_active" /></div></th>
                  <th className="px-4 lg:px-6 py-3 text-left cursor-pointer hover:bg-gray-100" onClick={() => handleSort('can_process')}><div className="flex items-center gap-1">Validation <SortIcon field="can_process" /></div></th>
                  <th className="px-4 lg:px-6 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAgents.map(agent => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="h-8 w-8 lg:h-10 lg:w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">{agent.name?.charAt(0).toUpperCase()}</div><div className="ml-3"><div className="text-sm font-medium">{agent.name}</div><div className="text-xs text-gray-500">ID: {agent.id}</div></div></div></td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="flex items-center text-sm"><Mail size={14} className="mr-2 text-gray-400" /><span className="truncate max-w-xs">{agent.email}</span></div></td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><div className="flex items-center text-sm"><Globe size={14} className="mr-2 text-gray-400" />{agent.country_name || agent.country || 'Non spécifié'}</div></td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap">{getStatusBadge(agent)}</td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agent.can_process ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{agent.can_process ? <><ShieldCheck size={12} className="mr-1" />Validé</> : <><AlertCircle size={12} className="mr-1" />En attente</>}</span></td>
                    <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button onClick={() => toggleCanProcess(agent)} className={agent.can_process ? "text-orange-600 hover:bg-orange-50 p-1 rounded" : "text-blue-600 hover:bg-blue-50 p-1 rounded"} title={agent.can_process ? "Retirer la validation" : "Valider"}>{agent.can_process ? <ShieldX size={16} /> : <ShieldCheck size={16} />}</button>
                        <button onClick={() => toggleAgentStatus(agent)} className={agent.is_active ? "text-orange-600 hover:bg-orange-50 p-1 rounded" : "text-green-600 hover:bg-green-50 p-1 rounded"} title={agent.is_active ? "Désactiver" : "Activer"}>{agent.is_active ? <UserX size={16} /> : <UserCheck size={16} />}</button>
                        <Link to={`/admin/agents/${agent.id}`} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"><Eye size={16} /></Link>
                        <button onClick={() => setModal({ mode: "edit", agent: { ...agent, password: "" } })} className="text-yellow-600 hover:bg-yellow-50 p-1 rounded"><Edit size={16} /></button>
                        <button onClick={() => setConfirmModal({ isOpen: true, agentId: agent.id, action: 'delete' })} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredAgents.length === 0 && <tr><td colSpan="6" className="px-6 py-8 text-center"><User size={32} className="text-gray-300 mx-auto mb-2" /><p className="font-medium text-gray-500">Aucun agent trouvé</p></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal d'ajout/modification */}
      {modal && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-50 p-4">
          <div className="bg-white p-4 lg:p-6 rounded-lg shadow-lg w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => { setModal(null); setShowPassword(false); }} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><X size={20} /></button>
            <h2 className="text-lg lg:text-xl font-semibold mb-4 flex items-center"><User size={18} className="mr-2" />{modal.mode === "add" ? "Nouvel agent" : "Modifier l'agent"}</h2>
            <form onSubmit={saveAgent} className="space-y-3 lg:space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label><input type="text" value={modal.agent.name || ''} onChange={e => setModal({ ...modal, agent: { ...modal.agent, name: e.target.value } })} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" value={modal.agent.email || ''} onChange={e => setModal({ ...modal, agent: { ...modal.agent, email: e.target.value } })} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe {modal.mode === "edit" && "(laisser vide pour ne pas modifier)"} *</label><div className="relative"><input type={showPassword ? "text" : "password"} value={modal.agent.password || ''} onChange={e => setModal({ ...modal, agent: { ...modal.agent, password: e.target.value } })} className="w-full border rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-indigo-500" required={modal.mode === "add"} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><Key size={14} /></button></div></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Pays *</label><select value={modal.agent.country_id || ''} onChange={e => setModal({ ...modal, agent: { ...modal.agent, country_id: e.target.value } })} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500" required><option value="">Sélectionnez un pays</option>{countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Statut</label><select value={modal.agent.is_active ? 'active' : 'inactive'} onChange={e => setModal({ ...modal, agent: { ...modal.agent, is_active: e.target.value === 'active' } })} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"><option value="active">Actif</option><option value="inactive">Inactif</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Permission de traitement</label><select value={modal.agent.can_process ? 'yes' : 'no'} onChange={e => setModal({ ...modal, agent: { ...modal.agent, can_process: e.target.value === 'yes' } })} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"><option value="no">En attente</option><option value="yes">Validé</option></select></div>
              <div className="flex justify-end gap-2 pt-3 border-t"><button type="button" onClick={() => { setModal(null); setShowPassword(false); }} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Annuler</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{modal.mode === "add" ? "Créer" : "Modifier"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}