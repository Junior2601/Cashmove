import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, XCircle, AlertCircle, Package, User, Home, ArrowLeft } from 'lucide-react';
import api from '../../api/axios';
import { decryptId } from '../../utils/encryption';

export default function TransactionDetail() {
  const { encryptedId } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setLoading(true);
        const id = decryptId(encryptedId);
        
        if (!id) {
          setError('Identifiant de transaction invalide');
          setLoading(false);
          return;
        }

        const res = await api.get(`/transactions/${id}`);
        setTransaction(res.data.data || res.data);
      } catch (err) {
        console.error('Erreur chargement transaction:', err);
        setError('Transaction introuvable');
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [encryptedId]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'en_attente':
        return <Clock className="h-8 w-8 text-yellow-600" />;
      case 'effectuee':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'echouee':
        return <XCircle className="h-8 w-8 text-red-600" />;
      case 'expiree':
        return <AlertCircle className="h-8 w-8 text-gray-600" />;
      default:
        return <Package className="h-8 w-8 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    const statusMap = {
      'en_attente': 'En attente',
      'effectuee': 'Effectuée',
      'echouee': 'Échouée',
      'expiree': 'Expirée'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'en_attente': return 'yellow';
      case 'effectuee': return 'green';
      case 'echouee': return 'red';
      case 'expiree': return 'gray';
      default: return 'gray';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non spécifié';
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const formatCurrency = (amount, currency) => {
    if (!amount) return '0';
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency || 'EUR'
      }).format(amount);
    } catch {
      return `${amount} ${currency || ''}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la transaction...</p>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaction introuvable</h2>
          <p className="text-gray-600 mb-6">{error || "Cette transaction n'existe pas ou a expiré."}</p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="h-5 w-5" />
            <span>Retour à l'accueil</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Retour à l'accueil</span>
          </Link>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* En-tête avec statut */}
          <div className={`bg-${getStatusColor(transaction.status)}-50 px-6 py-5 border-b border-${getStatusColor(transaction.status)}-200`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-3">
                {getStatusIcon(transaction.status)}
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Transaction {getStatusText(transaction.status)}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Code de suivi: <span className="font-mono font-semibold">{transaction.tracking_code}</span>
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-sm text-gray-600">Créée le</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(transaction.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Détails */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Expéditeur */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-2" />
                  Expéditeur
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Pays</span>
                    <p className="font-medium">{transaction.from_country_name || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Téléphone</span>
                    <p className="font-medium">{transaction.sender_phone || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Méthode de paiement</span>
                    <p className="font-medium">{transaction.sender_method_name || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Montant envoyé</span>
                    <p className="font-medium text-lg">
                      {formatCurrency(transaction.send_amount, transaction.from_currency_code)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bénéficiaire */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center">
                  <User className="h-5 w-5 text-green-600 mr-2" />
                  Bénéficiaire
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Pays</span>
                    <p className="font-medium">{transaction.to_country_name || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Téléphone</span>
                    <p className="font-medium">{transaction.receiver_phone || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Méthode de réception</span>
                    <p className="font-medium">{transaction.receiver_method_name || 'Non spécifié'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Montant à recevoir</span>
                    <p className="font-medium text-lg text-green-600">
                      {formatCurrency(transaction.receive_amount, transaction.to_currency_code)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Informations supplémentaires */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Taux appliqué</span>
                <p className="font-medium">{transaction.rate_applied || 'Non spécifié'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Commission</span>
                <p className="font-medium">{transaction.commission_applied ? `${transaction.commission_applied}%` : 'Non spécifié'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Numéro autorisé</span>
                <p className="font-medium">{transaction.authorized_number || 'Non spécifié'}</p>
              </div>
            </div>

            {/* Messages de statut */}
            {transaction.status === 'en_attente' && (
              <div className="mt-6 bg-yellow-50 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Transaction en cours
                </h4>
                <p className="text-yellow-700">
                  Votre transaction est en attente de confirmation. L'agent procédera au transfert une fois le paiement reçu.
                </p>
                {transaction.expires_at && (
                  <p className="text-sm text-yellow-600 mt-2">
                    ⏰ Expire le: {formatDate(transaction.expires_at)}
                  </p>
                )}
              </div>
            )}

            {transaction.status === 'effectuee' && (
              <div className="mt-6 bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Transaction terminée
                </h4>
                <p className="text-green-700">
                  Le bénéficiaire a reçu les fonds avec succès.
                </p>
                {transaction.completed_at && (
                  <p className="text-sm text-green-600 mt-2">
                    ✅ Complétée le: {formatDate(transaction.completed_at)}
                  </p>
                )}
              </div>
            )}

            {transaction.status === 'echouee' && (
              <div className="mt-6 bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                  <XCircle className="h-5 w-5 mr-2" />
                  Transaction échouée
                </h4>
                <p className="text-red-700">
                  La transaction a échoué. Contactez le service client pour plus d'informations.
                </p>
              </div>
            )}

            {transaction.status === 'expiree' && (
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Transaction expirée
                </h4>
                <p className="text-gray-700">
                  Le délai de paiement a expiré. Créez une nouvelle transaction si nécessaire.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}