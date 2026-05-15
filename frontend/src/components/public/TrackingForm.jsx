import React, { useState } from "react";
import api from "../../api/axios";
import { Search, CheckCircle, Clock, XCircle, AlertCircle, Package, User } from 'lucide-react';

export default function TrackingForm() {
  const [trackingCode, setTrackingCode] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Données simulées pour les pays avec mapping des devises
  const countries = [
    { id: 'Russie', name: 'Russie', currency: 'RUB', currencySymbol: '₽' },
    { id: 'Côte d\'Ivoire', name: 'Côte d\'Ivoire', currency: 'XOF', currencySymbol: 'CFA' },
    { id: 'Cameroun', name: 'Cameroun', currency: 'XAF', currencySymbol: 'FCFA' },
    { id: 'Mali', name: 'Mali', currency: 'XOF', currencySymbol: 'CFA' },
    { id: 'Congo', name: 'Congo', currency: 'XAF', currencySymbol: 'FCFA' },
    { id: 'Bénin', name: 'Bénin', currency: 'XOF', currencySymbol: 'CFA' },
    { id: 'Gabon', name: 'Gabon', currency: 'XAF', currencySymbol: 'FCFA' }
  ];

  // Fonction pour mapper les devises basée sur le code de devise
  const getCurrencyByCode = (currencyCode) => {
    const currencyMap = {
      'RUB': { currency: 'RUB', currencySymbol: '₽' },
      'XOF': { currency: 'XOF', currencySymbol: 'CFA' },
      'XAF': { currency: 'XAF', currencySymbol: 'FCFA' },
      'EUR': { currency: 'EUR', currencySymbol: '€' },
      'USD': { currency: 'USD', currencySymbol: '$' }
    };
    return currencyMap[currencyCode] || { currency: currencyCode, currencySymbol: '' };
  };

  const formatCurrency = (amount, currency, currencySymbol) => {
    if (!amount) return 'Non spécifié';
    
    // Formater le nombre avec séparateurs de milliers
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    return `${formattedAmount} ${currencySymbol}`;
  };

  // Fonction pour convertir le statut du backend vers le frontend
  const getFormattedStatus = (status) => {
    const statusMap = {
      'en_attente': 'En attente',
      'effectuee': 'Effectuée',
      'echouee': 'Échouée',
      'expiree': 'Expirée'
    };
    return statusMap[status] || status;
  };

  const getStatusIcon = (status) => {
    const formattedStatus = getFormattedStatus(status);
    switch (formattedStatus) {
      case 'En attente':
        return <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />;
      case 'Effectuée':
        return <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />;
      case 'Échouée':
        return <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />;
      case 'Expirée':
        return <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />;
      default:
        return <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    const formattedStatus = getFormattedStatus(status);
    switch (formattedStatus) {
      case 'En attente':
        return 'yellow';
      case 'Effectuée':
        return 'green';
      case 'Échouée':
        return 'red';
      case 'Expirée':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    
    if (!trackingCode.trim()) return;
    
    setIsSearching(true);
    
    try {
      const res = await api.get(`/transactions/tracking/${trackingCode}`);
      console.log('🔍 Résultat API:', res.data); // Pour debug
      setSearchResult(res.data);
    } catch (err) {
      console.error('❌ Erreur recherche:', err);
      setSearchResult('not_found');
    } finally {
      setIsSearching(false);
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    if (!dateString) return 'Non spécifié';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-0">
      {/* Search Form */}
      <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
          <Search className="h-5 w-5 text-blue-600 mr-2" />
          Rechercher une Transaction
        </h4>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Entrez votre code de suivi (ex: TRX12345678)"
              className="w-full px-3 sm:px-4 py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!trackingCode.trim() || isSearching}
            className="px-4 sm:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors text-sm sm:text-base"
          >
            {isSearching ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="hidden sm:inline">Recherche...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Rechercher</span>
                <span className="sm:hidden">OK</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResult && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {searchResult === 'not_found' ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
              </div>
              <h5 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Transaction Introuvable</h5>
              <p className="text-sm sm:text-base text-gray-600">
                Aucune transaction trouvée avec ce code. Vérifiez que vous avez saisi le bon code de suivi.
              </p>
            </div>
          ) : (
            <div>
              {/* Status Header */}
              <div className={`bg-${getStatusColor(searchResult.data?.status)}-50 px-4 sm:px-6 py-3 sm:py-4 border-b border-${getStatusColor(searchResult.data?.status)}-200`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    {getStatusIcon(searchResult.data?.status)}
                    <div>
                      <h5 className="text-base sm:text-lg font-semibold text-gray-900">
                        {getFormattedStatus(searchResult.data?.status)}
                      </h5>
                      <p className="text-xs sm:text-sm text-gray-600">
                        Code: {searchResult.data?.tracking_code || trackingCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm text-gray-600">Créée le</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                      {formatDate(searchResult.data?.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Transaction Details */}
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  {/* Sender Info */}
                  <div className="space-y-3 sm:space-y-4">
                    <h6 className="font-semibold text-gray-900 flex items-center text-sm sm:text-base">
                      <User className="h-4 w-4 text-blue-600 mr-2" />
                      Expéditeur
                    </h6>
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Pays</span>
                        <p className="font-medium text-sm sm:text-base">{searchResult.data?.from_country_name || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Téléphone</span>
                        <p className="font-medium text-sm sm:text-base">{searchResult.data?.sender_phone || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Méthode de paiement</span>
                        <p className="font-medium text-sm sm:text-base">{searchResult.data?.sender_method_name || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Montant envoyé</span>
                        <p className="font-medium text-sm sm:text-base">
                          {formatCurrency(
                            searchResult.data?.send_amount, 
                            searchResult.data?.from_currency_code,
                            searchResult.data?.from_currency_symbol
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Receiver Info */}
                  <div className="space-y-3 sm:space-y-4">
                    <h6 className="font-semibold text-gray-900 flex items-center text-sm sm:text-base">
                      <User className="h-4 w-4 text-green-600 mr-2" />
                      Bénéficiaire
                    </h6>
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Pays</span>
                        <p className="font-medium text-sm sm:text-base">{searchResult.data?.to_country_name || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Téléphone</span>
                        <p className="font-medium text-sm sm:text-base">{searchResult.data?.receiver_phone || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Méthode de réception</span>
                        <p className="font-medium text-sm sm:text-base">{searchResult.data?.receiver_method_name || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Montant à recevoir</span>
                        <p className="font-medium text-green-600 text-sm sm:text-base">
                          {formatCurrency(
                            searchResult.data?.receive_amount, 
                            searchResult.data?.to_currency_code,
                            searchResult.data?.to_currency_symbol
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informations supplémentaires */}
                <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Taux appliqué</span>
                    <p className="font-medium text-sm sm:text-base">{searchResult.data?.rate_applied ? `1 → ${searchResult.data.rate_applied}` : 'Non spécifié'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Commission</span>
                    <p className="font-medium text-sm sm:text-base">{searchResult.data?.commission_applied ? `${searchResult.data.commission_applied}%` : 'Non spécifié'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Numéro autorisé</span>
                    <p className="font-medium text-sm sm:text-base">{searchResult.data?.authorized_number || 'Non spécifié'}</p>
                  </div>
                </div>

                {/* Status Messages */}
                {searchResult.data?.status === 'en_attente' && (
                  <div className="mt-4 sm:mt-6 bg-yellow-50 rounded-lg p-3 sm:p-4">
                    <h6 className="font-semibold text-yellow-800 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                      <Clock className="h-4 w-4 mr-2" />
                      Transaction en Cours
                    </h6>
                    <p className="text-xs sm:text-sm text-yellow-700">
                      Votre transaction est en attente de confirmation. L'agent procédera au transfert une fois le paiement reçu.
                    </p>
                    {searchResult.data?.expires_at && (
                      <p className="text-xs sm:text-sm text-yellow-600 mt-2">
                        ⏰ Expire le: {formatDate(searchResult.data.expires_at)}
                      </p>
                    )}
                  </div>
                )}

                {searchResult.data?.status === 'effectuee' && (
                  <div className="mt-4 sm:mt-6 bg-green-50 rounded-lg p-3 sm:p-4">
                    <h6 className="font-semibold text-green-800 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Transaction Terminée
                    </h6>
                    <p className="text-xs sm:text-sm text-green-700">
                      Le bénéficiaire a reçu les fonds avec succès.
                    </p>
                    {searchResult.data?.completed_at && (
                      <p className="text-xs sm:text-sm text-green-600 mt-2">
                        ✅ Complétée le: {formatDate(searchResult.data.completed_at)}
                      </p>
                    )}
                  </div>
                )}

                {searchResult.data?.status === 'echouee' && (
                  <div className="mt-4 sm:mt-6 bg-red-50 rounded-lg p-3 sm:p-4">
                    <h6 className="font-semibold text-red-800 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                      <XCircle className="h-4 w-4 mr-2" />
                      Transaction Échouée
                    </h6>
                    <p className="text-xs sm:text-sm text-red-700">
                      La transaction a échoué. Contactez le service client pour plus d'informations.
                    </p>
                  </div>
                )}

                {searchResult.data?.status === 'expiree' && (
                  <div className="mt-4 sm:mt-6 bg-gray-50 rounded-lg p-3 sm:p-4">
                    <h6 className="font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center text-sm sm:text-base">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Transaction Expirée
                    </h6>
                    <p className="text-xs sm:text-sm text-gray-700">
                      Le délai de paiement a expiré. Créez une nouvelle transaction si nécessaire.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}