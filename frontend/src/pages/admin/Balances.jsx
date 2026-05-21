// src/pages/admin/BalancesList.jsx
import React, { useEffect, useState } from "react";
import { 
  Plus, Edit, Trash2, Search, Filter, Download, Upload, X,
  CreditCard, DollarSign, User, Currency, TrendingUp, TrendingDown,
  MoreVertical, RefreshCw
} from "lucide-react";
import api from "../../api/axios";

export default function AdminBalances() {
  const [balances, setBalances] = useState([]);
  const [agents, setAgents] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [reason, setReason] = useState("");

  const fetchBalances = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/balances");
      // La réponse est { success: true, data: [...] }
      setBalances(res.data?.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Erreur lors du chargement des balances");
    } finally {
      setLoading(false);
    }
  };

  // Récupération des agents (admin uniquement)
  const fetchAgents = async () => {
    try {
      const res = await api.get("/agents/admin/all");
      // La réponse est { success: true, data: [...] }
      setAgents(res.data?.data || []);
    } catch (err) {
      console.error("Erreur lors du chargement des agents", err);
      setError("Impossible de charger la liste des agents. Vérifiez vos droits.");
      setAgents([]);
    }
  };

  // Récupération des devises (avec token → toutes les devises pour admin)
  const fetchCurrencies = async () => {
    try {
      const res = await api.get("/currencies");
      // La réponse est { success: true, data: [...] }
      const currenciesData = res.data?.data || [];
      setCurrencies(currenciesData);
    } catch (err) {
      console.error("Erreur lors du chargement des devises", err);
      setCurrencies([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchBalances(),
        fetchAgents(),
        fetchCurrencies()
      ]);
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredBalances = balances.filter(balance => {
    const agentName = balance.agent_name || "";
    const currencyName = balance.currency_name || "";
    return agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           currencyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           balance.amount?.toString().includes(searchTerm);
  });

  // Créer une nouvelle balance (POST /balances)
  const createBalance = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post("/balances", {
        agent_id: parseInt(modal.balance.agent_id),
        currency_id: parseInt(modal.balance.currency_id)
        // amount est optionnel, par défaut 0
      });
      
      if (response.data.success) {
        setModal(null);
        await fetchBalances();
      } else {
        setError(response.data.message || "Erreur lors de la création");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Erreur lors de la création de la balance");
    }
  };

  // Créditer une balance (PATCH /balances/:id/credit)
  const creditBalance = async (e) => {
    e.preventDefault();
    const balanceId = modal.balance.id;
    if (!balanceId) {
      setError("Identifiant de balance manquant");
      return;
    }
    try {
      const response = await api.patch(`/balances/${balanceId}/credit`, {
        amount: parseFloat(modal.balance.amount),
        description: modal.reason || ""
      });
      
      if (response.data.success) {
        setModal(null);
        setReason("");
        await fetchBalances();
      } else {
        setError(response.data.message || "Erreur lors du crédit");
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || err.message;
      setError("Erreur lors du crédit: " + errorMessage);
    }
  };

  // Débiter une balance (PATCH /balances/:id/debit)
  const debitBalance = async (e) => {
    e.preventDefault();
    const balanceId = modal.balance.id;
    if (!balanceId) {
      setError("Identifiant de balance manquant");
      return;
    }
    try {
      const response = await api.patch(`/balances/${balanceId}/debit`, {
        amount: parseFloat(modal.balance.amount),
        description: modal.reason || ""
      });
      
      if (response.data.success) {
        setModal(null);
        setReason("");
        await fetchBalances();
      } else {
        setError(response.data.message || "Erreur lors du débit");
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || err.message;
      setError("Erreur lors du débit: " + errorMessage);
      
      if (errorMessage.includes('Solde insuffisant')) {
        setTimeout(() => {
          setError("❌ Solde insuffisant pour effectuer cette opération");
        }, 100);
      }
    }
  };

  // Supprimer une balance (DELETE /balances/:id) - soft delete
  const deleteBalance = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette balance ?\nCette action est irréversible et sera enregistrée dans l'historique.")) return;
    try {
      const response = await api.delete(`/balances/${id}`);
      if (response.data.success) {
        await fetchBalances();
      } else {
        setError(response.data.message || "Erreur lors de la suppression");
      }
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la suppression: " + (err.response?.data?.message || err.message));
    }
  };

  // Vérification locale du solde suffisant
  const hasSufficientBalance = (balance, amount) => {
    return balance.amount >= amount;
  };

  const getAgentName = (balance) => {
    return balance.agent_name ? `${balance.agent_name} (${balance.agent_email})` : "Agent inconnu";
  };

  const getCurrencyName = (balance) => {
    return balance.currency_name ? `${balance.currency_name} (${balance.currency_code})` : "Devise inconnue";
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Gérer la soumission selon le mode
  const handleSubmit = (e) => {
    if (modal.mode === "add") {
      createBalance(e);
    } else if (modal.mode === "credit") {
      creditBalance(e);
    } else if (modal.mode === "debit") {
      debitBalance(e);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Gestion des Balances</h1>
          <p className="text-gray-600 text-xs sm:text-sm">Gérez les soldes des agents par devise</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200">
            <div className="flex flex-col space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher par agent, devise ou montant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
                  Filtres
                  {showFilters && <X className="h-3 w-3 sm:h-4 sm:w-4" />}
                </button>

                <div className="flex gap-2">
                  <button 
                    onClick={fetchBalances}
                    className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    title="Rafraîchir"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                  <button className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                    <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                  <button className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                    <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                  <button
                    onClick={() => setModal({
                      mode: "add",
                      balance: { agent_id: "", currency_id: "", amount: 0 },
                      reason: ""
                    })}
                    className="flex items-center gap-2 px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus size={14} className="sm:size-4" />
                    <span className="hidden sm:inline">Nouvelle Balance</span>
                    <span className="sm:hidden">Nouvelle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="m-3 sm:m-4 bg-red-50 border border-red-200 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <X className="w-4 h-4 text-red-500 mr-2" />
                  <h3 className="text-red-800 font-semibold text-sm">Erreur</h3>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X size={16} />
                </button>
              </div>
              <p className="text-red-600 mt-1 text-sm">{error}</p>
            </div>
          )}

          {/* Version mobile */}
          <div className="sm:hidden">
            {filteredBalances.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="text-gray-400 mb-3">
                  <CreditCard className="w-12 h-12 mx-auto" />
                </div>
                <p className="text-gray-500 text-base">Aucune balance trouvée</p>
                <p className="text-gray-400 text-sm mt-1">
                  {searchTerm 
                    ? "Modifiez vos critères de recherche" 
                    : "Commencez par créer une nouvelle balance"
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredBalances.map((balance) => (
                  <div key={balance.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-gray-900 text-sm truncate">
                              {getAgentName(balance)}
                            </h3>
                            <p className="text-gray-500 text-xs truncate">
                              {getCurrencyName(balance)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-lg font-bold text-gray-900 mb-3">
                          {formatAmount(balance.amount)} 
                          <span className="text-sm font-normal text-gray-500 ml-1">
                            {balance.currency_code}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setModal({
                              mode: "credit",
                              balance: { ...balance, amount: 0 },
                              reason: ""
                            })}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors text-xs"
                          >
                            <TrendingUp size={12} />
                            Créditer
                          </button>
                          <button
                            onClick={() => setModal({
                              mode: "debit",
                              balance: { ...balance, amount: 0 },
                              reason: ""
                            })}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-50 transition-colors text-xs"
                          >
                            <TrendingDown size={12} />
                            Débiter
                          </button>
                          <button
                            onClick={() => deleteBalance(balance.id)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors text-xs"
                          >
                            <Trash2 size={12} />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devise</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière mise à jour</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBalances.map((balance) => (
                  <tr key={balance.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{balance.id}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="max-w-xs truncate">{getAgentName(balance)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Currency className="w-4 h-4 text-gray-400 mr-2" />
                        {getCurrencyName(balance)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatAmount(balance.amount)}
                        <span className="text-sm font-normal text-gray-500 ml-1">{balance.currency_code}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {balance.last_updated ? new Date(balance.last_updated).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setModal({
                            mode: "credit",
                            balance: { ...balance, amount: 0 },
                            reason: ""
                          })}
                          className="text-green-600 hover:text-green-900 transition-colors flex items-center gap-1"
                        >
                          <TrendingUp size={16} />
                          Créditer
                        </button>
                        <button
                          onClick={() => setModal({
                            mode: "debit",
                            balance: { ...balance, amount: 0 },
                            reason: ""
                          })}
                          className="text-orange-600 hover:text-orange-900 transition-colors flex items-center gap-1"
                        >
                          <TrendingDown size={16} />
                          Débiter
                        </button>
                        <button
                          onClick={() => deleteBalance(balance.id)}
                          className="text-red-600 hover:text-red-900 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={12} />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBalances.length > 0 && (
            <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {filteredBalances.length} balance{filteredBalances.length > 1 ? 's' : ''} trouvée{filteredBalances.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Création/Crédit/Débit */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start sm:items-center p-3 sm:p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-4 sm:p-6 rounded-xl shadow-lg w-full max-w-md mt-8 sm:mt-0 mb-8 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                {modal.mode === "add" && <Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
                {modal.mode === "credit" && <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
                {modal.mode === "debit" && <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />}
                <span className="text-sm sm:text-base">
                  {modal.mode === "add"
                    ? "Nouvelle Balance"
                    : modal.mode === "credit"
                    ? "Créditer la Balance"
                    : "Débiter la Balance"}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setReason("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {(modal.mode === "add") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agent <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={modal.balance.agent_id}
                      onChange={(e) =>
                        setModal({
                          ...modal,
                          balance: { ...modal.balance, agent_id: e.target.value },
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Sélectionnez un agent</option>
                      {Array.isArray(agents) && agents.map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Devise <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={modal.balance.currency_id}
                      onChange={(e) =>
                        setModal({
                          ...modal,
                          balance: { ...modal.balance, currency_id: e.target.value },
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Sélectionnez une devise</option>
                      {Array.isArray(currencies) && currencies.map(currency => (
                        <option key={currency.id} value={currency.id}>
                          {currency.name} ({currency.code}) {currency.symbol && `- ${currency.symbol}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p className="text-xs sm:text-sm text-gray-500 bg-blue-50 p-2 rounded">
                      ℹ️ La balance sera créée avec un solde initial de 0. Vous pourrez ensuite la créditer.
                    </p>
                  </div>
                </>
              )}

              {(modal.mode === "credit" || modal.mode === "debit") && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={modal.balance.amount}
                      onChange={(e) =>
                        setModal({
                          ...modal,
                          balance: { ...modal.balance, amount: e.target.value },
                        })
                      }
                      placeholder="0.00"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    {modal.mode === "debit" && modal.balance.amount > 0 && (
                      <p className={`text-xs mt-1 ${hasSufficientBalance(modal.balance, modal.balance.amount) ? 'text-green-600' : 'text-red-600'}`}>
                        {hasSufficientBalance(modal.balance, modal.balance.amount) 
                          ? `✓ Solde suffisant (${formatAmount(modal.balance.amount)} disponible)` 
                          : `✗ Solde insuffisant (${formatAmount(modal.balance.amount)} disponible)`}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motif (optionnel)
                    </label>
                    <input
                      type="text"
                      value={modal.reason || ""}
                      onChange={(e) =>
                        setModal({
                          ...modal,
                          reason: e.target.value,
                        })
                      }
                      placeholder="Raison de l'opération..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ce motif sera enregistré dans l'historique
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setModal(null);
                  setReason("");
                }}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm text-white rounded-lg transition-colors ${
                  modal.mode === "add"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : modal.mode === "credit"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-orange-600 hover:bg-orange-700"
                } ${modal.mode === "debit" && modal.balance.amount > 0 && !hasSufficientBalance(modal.balance, modal.balance.amount) ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={modal.mode === "debit" && modal.balance.amount > 0 && !hasSufficientBalance(modal.balance, modal.balance.amount)}
              >
                {modal.mode === "add"
                  ? "Créer"
                  : modal.mode === "credit"
                  ? "Créditer"
                  : "Débiter"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}