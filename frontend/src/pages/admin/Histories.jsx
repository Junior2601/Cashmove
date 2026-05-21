import { useEffect, useState } from "react";
import { 
  FileDown, AlertCircle, RefreshCw, Eye, Calendar, X, 
  UserPlus, UserCog, BarChart3, DollarSign, TrendingUp, TrendingDown,
  Clock, AlertTriangle, CheckCircle, ArrowRightLeft, UserCheck,
  Shield, CreditCard, Globe, Mail, Phone, Settings, Filter, ChevronDown, ChevronUp
} from "lucide-react";
import api from "../../api/axios";

export default function HistoryList() {
  const [history, setHistory] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [showRawData, setShowRawData] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Mapping des icônes et couleurs par type d'action
  const actionIcons = {
    rate_created: { icon: TrendingUp, color: "bg-green-100 text-green-600" },
    rate_updated: { icon: BarChart3, color: "bg-blue-100 text-blue-600" },
    rate_deleted: { icon: TrendingDown, color: "bg-red-100 text-red-600" },
    rate_status_changed: { icon: Settings, color: "bg-orange-100 text-orange-600" },
    transaction_created: { icon: DollarSign, color: "bg-purple-100 text-purple-600" },
    transaction_validated: { icon: CheckCircle, color: "bg-green-100 text-green-600" },
    transaction_cancelled: { icon: X, color: "bg-red-100 text-red-600" },
    transaction_expired: { icon: Clock, color: "bg-gray-100 text-gray-600" },
    client_validation: { icon: UserCheck, color: "bg-blue-100 text-blue-600" },
    transaction_redirected: { icon: ArrowRightLeft, color: "bg-indigo-100 text-indigo-600" },
    agent_created: { icon: UserPlus, color: "bg-teal-100 text-teal-600" },
    agent_updated: { icon: UserCog, color: "bg-amber-100 text-amber-600" },
    agent_deleted: { icon: UserCog, color: "bg-rose-100 text-rose-600" },
    redirection_accepted: { icon: CheckCircle, color: "bg-green-100 text-green-600" },
    redirection_rejected: { icon: X, color: "bg-red-100 text-red-600" },
    default: { icon: Clock, color: "bg-gray-100 text-gray-600" }
  };

  const getPriority = (actionType) => {
    const highPriority = ['transaction_expired', 'transaction_cancelled', 'rate_deleted', 'agent_deleted'];
    const mediumPriority = ['transaction_redirected', 'rate_updated', 'agent_updated'];
    
    if (highPriority.includes(actionType)) return { level: 'high', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
    if (mediumPriority.includes(actionType)) return { level: 'medium', color: 'bg-orange-100 text-orange-800', icon: Clock };
    return { level: 'low', color: 'bg-green-100 text-green-800', icon: RefreshCw };
  };

  const formatActionTitle = (actionType) => {
    const titles = {
      rate_created: "Création Taux",
      rate_updated: "Mise à jour Taux",
      rate_deleted: "Suppression Taux",
      rate_status_changed: "Changement Statut Taux",
      transaction_created: "Création Transaction",
      transaction_validated: "Validation Transaction",
      transaction_cancelled: "Annulation Transaction",
      transaction_expired: "Expiration Transaction",
      client_validation: "Validation Client",
      transaction_redirected: "Redirection Transaction",
      agent_created: "Création Agent",
      agent_updated: "Modification Agent",
      agent_deleted: "Suppression Agent",
      redirection_accepted: "Redirection Acceptée",
      redirection_rejected: "Redirection Rejetée"
    };
    return titles[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Construction du sous-titre à partir des métadonnées ou des champs disponibles
  const getSubtitle = (item) => {
    const metadata = item.metadata || {};
    
    // Utiliser le nom de l'entité s'il existe (non fourni actuellement)
    if (item.entity_name) return item.entity_name;
    
    // Métadonnées courantes
    if (metadata.from_currency && metadata.to_currency) {
      return `${metadata.from_currency} → ${metadata.to_currency}`;
    }
    if (metadata.agent_name) return metadata.agent_name;
    if (metadata.from_agent_name && metadata.to_agent_name) {
      return `${metadata.from_agent_name} → ${metadata.to_agent_name}`;
    }
    if (metadata.tracking_code) return `Code: ${metadata.tracking_code}`;
    
    // Sinon, utiliser le type d'entité + son ID
    return item.entity_type ? `${item.entity_type} #${item.entity_id || ''}` : "Système";
  };

  // Affichage de l'acteur : nom (si disponible) ou type + ID
  const getActorDisplayName = (item) => {
    if (item.actor_name) return `${item.actor_name} (${item.actor_type})`;
    if (item.actor_type && item.actor_id) return `${item.actor_type} #${item.actor_id}`;
    return item.actor_type || "Système";
  };

  const formatDateToYMD = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const applyFilters = () => {
    if (!allHistory.length) return;
    let filtered = [...allHistory];
    if (actionTypeFilter) {
      filtered = filtered.filter(item => item.action_type === actionTypeFilter);
    }
    if (dateFilter) {
      filtered = filtered.filter(item => formatDateToYMD(item.created_at) === dateFilter);
    }
    setHistory(filtered);
  };

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    setRawResponse(null);
    try {
      const response = await api.get("/history");
      console.log("Réponse complète de l'API:", response);
      setRawResponse(response);
      
      // Adaptation à la réponse { success: true, data: [...] }
      let historyData = [];
      if (response.data && response.data.success === true && Array.isArray(response.data.data)) {
        historyData = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        historyData = response.data;
      } else {
        setError("Format de données invalide : attendu { success: true, data: [...] }");
        setHistory([]);
        setAllHistory([]);
        return;
      }

      // Trier par date décroissante
      historyData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setAllHistory(historyData);
      setHistory(historyData);
      
    } catch (err) {
      console.error("Erreur lors du chargement de l'historique :", err);
      if (err.response?.status === 403) {
        setError("Accès refusé. Vérifiez vos permissions administrateur.");
      } else if (err.response?.status === 401) {
        setError("Session expirée. Veuillez vous reconnecter.");
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Erreur lors du chargement de l'historique");
      }
      setHistory([]);
      setAllHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchHistory(); 
  }, []);

  useEffect(() => {
    if (allHistory.length > 0) {
      applyFilters();
    }
  }, [dateFilter, actionTypeFilter, allHistory]);

  const handleFilter = () => {
    applyFilters();
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDateFilter("");
    setActionTypeFilter("");
    applyFilters();
    setShowFilters(false);
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    
    const headers = ["ID", "Type d'action", "Acteur", "Type d'acteur", "ID Acteur", "Type d'entité", "Entité", "ID Entité", "Description", "Date"];
    const rows = history.map(h => [
      h.id,
      h.action_type,
      getActorDisplayName(h),
      h.actor_type,
      h.actor_id || 'N/A',
      h.entity_type || 'N/A',
      getSubtitle(h),
      h.entity_id || 'N/A',
      h.description,
      new Date(h.created_at).toLocaleString('fr-FR')
    ]);

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `historique_${dateFilter || 'complet'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actionTypes = [
    'rate_created', 'rate_updated', 'rate_deleted', 'rate_status_changed',
    'transaction_created', 'transaction_validated', 'transaction_cancelled', 'transaction_expired',
    'client_validation', 'transaction_redirected', 'redirection_accepted', 'redirection_rejected',
    'agent_created', 'agent_updated', 'agent_deleted'
  ];

  const hasActiveFilters = dateFilter || actionTypeFilter;

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="flex justify-center items-center h-48">
          <div className="text-center">
            <RefreshCw className="animate-spin w-8 h-8 text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">Chargement de l'historique...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Historique des activités</h1>
          <p className="text-gray-600 text-sm">Suivi complet des actions du système</p>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* En-tête avec actions */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800">Activités récentes</h2>
                  <p className="text-gray-500 text-sm">
                    {history.length} activité(s){hasActiveFilters && ' filtrée(s)'} sur {allHistory.length} au total
                  </p>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex-1 sm:flex-none justify-center"
                >
                  <Filter className="w-4 h-4" />
                  <span className="sm:hidden">Filtres</span>
                  <span className="hidden sm:inline">Filtres</span>
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Données brutes"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={fetchHistory}
                  className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={exportCSV}
                  disabled={history.length === 0}
                  className="p-2 border border-blue-600 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:border-gray-400 disabled:cursor-not-allowed"
                  title="Exporter CSV"
                >
                  <FileDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filtres */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="lg:hidden mb-3">
                <h3 className="font-semibold text-gray-700 flex items-center">
                  <Filter className="w-4 h-4 mr-2" /> Filtres de recherche
                </h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date spécifique
                  </label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type d'action
                  </label>
                  <select
                    value={actionTypeFilter}
                    onChange={(e) => setActionTypeFilter(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Tous les types</option>
                    {actionTypes.map(type => (
                      <option key={type} value={type}>
                        {formatActionTitle(type)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={handleFilter}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 text-sm"
                  >
                    <Calendar className="w-4 h-4" />
                    Appliquer
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                    >
                      <X className="w-4 h-4" />
                      Effacer
                    </button>
                  )}
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>Filtres actifs:</strong>
                    {dateFilter && ` Date: ${new Date(dateFilter).toLocaleDateString('fr-FR')}`}
                    {actionTypeFilter && ` Type: ${formatActionTitle(actionTypeFilter)}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="m-4 bg-red-50 border border-red-200 p-3 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <h3 className="text-red-800 font-semibold text-sm">Erreur</h3>
              </div>
              <p className="text-red-600 mt-1 text-sm">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
              >
                Réessayer
              </button>
            </div>
          )}

          {showRawData && rawResponse && (
            <div className="m-4 p-3 bg-gray-100 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm">Données brutes de l'API :</h3>
                <button
                  onClick={() => setShowRawData(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <pre className="text-xs overflow-auto p-2 bg-white border rounded max-h-60">
                {JSON.stringify(rawResponse.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Contenu principal */}
          <div className="p-4">
            {history.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-3">
                  <Clock className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-500 text-sm mb-2">
                  {hasActiveFilters 
                    ? "Aucun résultat pour les filtres sélectionnés" 
                    : "Aucune activité disponible"}
                </p>
                <div className="flex gap-2 justify-center">
                  {!error && (
                    <button
                      onClick={fetchHistory}
                      className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      Actualiser
                    </button>
                  )}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Version mobile */}
                <div className="lg:hidden space-y-3">
                  {history.map((item) => {
                    const IconComponent = (actionIcons[item.action_type] || actionIcons.default).icon;
                    const iconColor = (actionIcons[item.action_type] || actionIcons.default).color;
                    const priority = getPriority(item.action_type);

                    return (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-full ${iconColor} flex-shrink-0`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                                {formatActionTitle(item.action_type)}
                              </h3>
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${priority.color} flex-shrink-0 ml-2`}>
                                {priority.level}
                              </span>
                            </div>
                            <p className="text-gray-600 text-xs mb-1">
                              {getSubtitle(item)}
                            </p>
                            <p className="text-gray-500 text-xs mb-2 line-clamp-2">
                              {item.description}
                            </p>
                            <div className="flex items-center text-xs text-gray-400">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(item.created_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {item.actor_type && (
                              <div className="text-xs text-gray-400 mt-1">
                                Par: {getActorDisplayName(item)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Version desktop (tableau) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détails</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acteur</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priorité</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {history.map((item) => {
                        const IconComponent = (actionIcons[item.action_type] || actionIcons.default).icon;
                        const iconColor = (actionIcons[item.action_type] || actionIcons.default).color;
                        const priority = getPriority(item.action_type);

                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`p-2 rounded-full ${iconColor} mr-3`}>
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {formatActionTitle(item.action_type)}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {getSubtitle(item)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 max-w-xs">
                                {item.description}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {new Date(item.created_at).toLocaleString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {getActorDisplayName(item)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priority.color}`}>
                                {priority.level}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    Affichage de {history.length} activité(s){hasActiveFilters && ' filtrée(s)'} sur {allHistory.length} au total
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}