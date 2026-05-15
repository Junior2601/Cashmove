import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Send, ArrowRight, Check, AlertCircle, RefreshCw, X, ChevronDown } from 'lucide-react';
import { 
  validatePhoneNumber, 
  getPhoneFormatExamples,
  formatPhoneWithPrefix 
} from '../../utils/phoneValidator';
import { encryptId } from '../../utils/encryption';

// Composant personnalisé pour le select de pays avec drapeaux
const CountrySelect = ({ 
  value, 
  onChange, 
  countries, 
  error, 
  placeholder = "Sélectionner un pays",
  excludeCountryId = null 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedCountry = countries.find(c => c.id === parseInt(value));
  const filteredCountries = excludeCountryId 
    ? countries.filter(c => c.id !== parseInt(excludeCountryId))
    : countries;

  const getCountryFlag = (countryName) => {
    if (!countryName) return '/flags/default.png';
    const cleanName = countryName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `/flags/${cleanName}.png`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-lg border transition-colors text-left flex items-center justify-between ${
          error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
        } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 bg-white`}
      >
        <div className="flex items-center space-x-3">
          {selectedCountry ? (
            <>
              <img 
                src={getCountryFlag(selectedCountry.name)} 
                alt={`Drapeau ${selectedCountry.name}`}
                className="w-6 h-4 object-cover rounded-sm"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span>
                {selectedCountry.name} ({selectedCountry.currency_code}) - {selectedCountry.phone_prefix}
              </span>
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredCountries.map(country => (
              <div
                key={country.id}
                onClick={() => { onChange(country.id.toString()); setIsOpen(false); }}
                className={`flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                  value === country.id.toString() ? 'bg-blue-50 text-blue-600' : ''
                }`}
              >
                <img 
                  src={getCountryFlag(country.name)} 
                  alt={`Drapeau ${country.name}`}
                  className="w-6 h-4 object-cover rounded-sm"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span>{country.name} ({country.currency_code}) - {country.phone_prefix}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

// Composant personnalisé pour le select des moyens de paiement avec images
const PaymentMethodSelect = ({ 
  value, 
  onChange, 
  paymentMethods, 
  error, 
  placeholder = "Sélectionner un moyen de paiement",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedMethod = paymentMethods.find(m => m.id === parseInt(value));

  const getPaymentMethodImage = (methodName) => {
    if (!methodName) return '/payment-methods/default.png';
    const methodMap = {
      'orange money': '/payment-methods/orange-money.png',
      'mtn money': '/payment-methods/mtn-money.png',
      'wave': '/payment-methods/wave.png',
      'airtel money': '/payment-methods/airtel-money.png',
      'momo': '/payment-methods/momo.png',
      'alpha bank': '/payment-methods/alpha-bank.png',
      'sberbank': '/payment-methods/sberbank.png',
      'tinkoff': '/payment-methods/tinkoff.png'
    };
    const normalizedName = methodName.toLowerCase();
    return methodMap[normalizedName] || `/payment-methods/${normalizedName.replace(/\s+/g, '-')}.png`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-lg border transition-colors text-left flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'
        } ${
          error ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
        } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
      >
        <div className="flex items-center space-x-3">
          {selectedMethod ? (
            <>
              <img 
                src={getPaymentMethodImage(selectedMethod.method)} 
                alt={`Logo ${selectedMethod.method}`}
                className="w-6 h-6 object-contain rounded-sm"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <span>{selectedMethod.method}</span>
            </>
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''} ${disabled ? 'opacity-50' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {paymentMethods.length > 0 ? (
              paymentMethods.map(method => (
                <div
                  key={method.id}
                  onClick={() => { onChange(method.id.toString()); setIsOpen(false); }}
                  className={`flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                    value === method.id.toString() ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  <img 
                    src={getPaymentMethodImage(method.method)} 
                    alt={`Logo ${method.method}`}
                    className="w-6 h-6 object-contain rounded-sm"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span>{method.method}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500 text-center">
                Aucun moyen de paiement disponible
              </div>
            )}
          </div>
        </>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default function TransactionForm({ onTransactionComplete }) {
  const [formData, setFormData] = useState({
    senderCountryId: '',
    senderPhone: '',
    senderPaymentMethodId: '',
    receiverCountryId: '',
    receiverPhone: '',
    receiverPaymentMethodId: '',
    sentAmount: ''
  });

  const [receivedAmount, setReceivedAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  
  const [phoneValidation, setPhoneValidation] = useState({
    sender: { isValid: null, message: '', examples: [], touched: false, maxLength: 15 },
    receiver: { isValid: null, message: '', examples: [], touched: false, maxLength: 15 }
  });

  const navigate = useNavigate();

  const handleRetry = () => { fetchData(); };

  // Charger les pays et méthodes de paiement
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setLoadError('');
      
      // Utiliser l'endpoint /countries (GET /)
      const countriesResponse = await api.get('/countries');
      
      // Extraire les données selon la structure { success: true, data: [...] }
      let countriesData = countriesResponse.data.data || countriesResponse.data;
      
      if (!Array.isArray(countriesData) || countriesData.length === 0) {
        throw new Error('Aucun pays disponible');
      }
      
      setCountries(countriesData);

      // Charger les méthodes de paiement pour chaque pays
      const methodsByCountry = {};
      const paymentMethodPromises = countriesData.map(async (country) => {
        try {
          // Utiliser l'endpoint /payment-method/country/:countryId
          const methodsResponse = await api.get(`/payment-methods/country/${country.id}`);
          // Extraire les données
          methodsByCountry[country.id] = methodsResponse.data.data || methodsResponse.data || [];
        } catch (error) {
          console.warn(`⚠️ Erreur méthodes pour pays ${country.id}:`, error.message);
          methodsByCountry[country.id] = [];
        }
      });

      await Promise.allSettled(paymentMethodPromises);
      setPaymentMethods(methodsByCountry);
      
    } catch (error) {
      console.error('💥 Erreur lors du chargement des données:', error);
      setLoadError(error.message || 'Erreur de chargement des données');
      setCountries([]);
      setPaymentMethods({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Validation des numéros de téléphone en temps réel
  useEffect(() => {
    if (formData.senderPhone && formData.senderCountryId) {
      const country = getCountryById(formData.senderCountryId);
      if (country?.phone_prefix) {
        const validation = validatePhoneNumber(formData.senderPhone, null, country.phone_prefix);
        setPhoneValidation(prev => ({
          ...prev,
          sender: { ...validation, touched: true, maxLength: validation.maxLength || 15 }
        }));
      }
    } else {
      setPhoneValidation(prev => ({
        ...prev,
        sender: { isValid: null, message: '', examples: [], touched: false, maxLength: 15 }
      }));
    }
  }, [formData.senderPhone, formData.senderCountryId]);

  useEffect(() => {
    if (formData.receiverPhone && formData.receiverCountryId) {
      const country = getCountryById(formData.receiverCountryId);
      if (country?.phone_prefix) {
        const validation = validatePhoneNumber(formData.receiverPhone, null, country.phone_prefix);
        setPhoneValidation(prev => ({
          ...prev,
          receiver: { ...validation, touched: true, maxLength: validation.maxLength || 15 }
        }));
      }
    } else {
      setPhoneValidation(prev => ({
        ...prev,
        receiver: { isValid: null, message: '', examples: [], touched: false, maxLength: 15 }
      }));
    }
  }, [formData.receiverPhone, formData.receiverCountryId]);

  const getCountryById = (id) => {
    return countries.find(country => country.id === parseInt(id));
  };

  const getPaymentMethodsByCountryId = (countryId) => {
    return paymentMethods[countryId] || [];
  };

  const senderCountry = getCountryById(formData.senderCountryId);
  const receiverCountry = getCountryById(formData.receiverCountryId);
  const senderPaymentMethods = getPaymentMethodsByCountryId(formData.senderCountryId);
  const receiverPaymentMethods = getPaymentMethodsByCountryId(formData.receiverCountryId);

  const handlePhoneChange = (field, value) => {
    const cleanedValue = value.replace(/\D/g, '');
    let maxLength = 15;
    
    if (field === 'senderPhone' && formData.senderCountryId) {
      const country = getCountryById(formData.senderCountryId);
      if (country?.phone_prefix) {
        const validation = validatePhoneNumber(cleanedValue, null, country.phone_prefix);
        maxLength = typeof validation.maxLength === 'number' ? validation.maxLength : 15;
      }
    } else if (field === 'receiverPhone' && formData.receiverCountryId) {
      const country = getCountryById(formData.receiverCountryId);
      if (country?.phone_prefix) {
        const validation = validatePhoneNumber(cleanedValue, null, country.phone_prefix);
        maxLength = typeof validation.maxLength === 'number' ? validation.maxLength : 15;
      }
    }
    
    if (cleanedValue.length <= maxLength) {
      setFormData(prev => ({ ...prev, [field]: cleanedValue }));
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
      if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
  };

  // Calculer le taux de change - CORRIGÉ pour utiliser les endpoints disponibles
  useEffect(() => {
    if (formData.sentAmount && formData.sentAmount > 0 && formData.senderCountryId && formData.receiverCountryId) {
      const calculateExchangeRate = async () => {
        try {
          const senderCountryData = getCountryById(formData.senderCountryId);
          const receiverCountryData = getCountryById(formData.receiverCountryId);
          
          if (!senderCountryData || !receiverCountryData) {
            const defaultRate = 0.85;
            setExchangeRate(defaultRate);
            setReceivedAmount(parseFloat(formData.sentAmount) * defaultRate);
            return;
          }

          // Utiliser l'endpoint /rate/active/pair/:from_currency_id/:to_currency_id
          const fromCurrencyId = senderCountryData.currency_id;
          const toCurrencyId = receiverCountryData.currency_id;
          
          try {
            const response = await api.get(`/rates/active/pair/${fromCurrencyId}/${toCurrencyId}`);
            
            // Extraire le taux de la réponse { success: true, data: {...} }
            const rateData = response.data.data;
            if (rateData && rateData.rate) {
              const rate = parseFloat(rateData.rate);
              setExchangeRate(rate);
              setReceivedAmount(parseFloat(formData.sentAmount) * rate);
              return;
            }
          } catch (pairError) {
            console.warn('⚠️ Endpoint /rate/active/pair non disponible, essai /rate/active...');
          }

          // Fallback: utiliser /rate/active et chercher la paire
          try {
            const activeRatesResponse = await api.get('/rates/active');
            const rates = activeRatesResponse.data.data || [];
            
            const rateData = rates.find(rate => 
              rate.from_currency_id === fromCurrencyId && 
              rate.to_currency_id === toCurrencyId
            );
            
            if (rateData && rateData.rate) {
              const rate = parseFloat(rateData.rate);
              setExchangeRate(rate);
              setReceivedAmount(parseFloat(formData.sentAmount) * rate);
              return;
            }
          } catch (activeError) {
            console.warn('⚠️ Endpoint /rate/active non disponible');
          }

          // Fallback final: taux par défaut basé sur les codes devise
          const defaultRate = getDefaultExchangeRate(senderCountryData, receiverCountryData);
          setExchangeRate(defaultRate);
          setReceivedAmount(parseFloat(formData.sentAmount) * defaultRate);
          
        } catch (error) {
          console.warn('⚠️ Erreur calcul taux:', error.message);
          const senderCountryData = getCountryById(formData.senderCountryId);
          const receiverCountryData = getCountryById(formData.receiverCountryId);
          const defaultRate = getDefaultExchangeRate(senderCountryData, receiverCountryData);
          setExchangeRate(defaultRate);
          setReceivedAmount(parseFloat(formData.sentAmount) * defaultRate);
        }
      };
      
      calculateExchangeRate();
    } else {
      setReceivedAmount(0);
      setExchangeRate(0);
    }
  }, [formData.sentAmount, formData.senderCountryId, formData.receiverCountryId]);

  const getDefaultExchangeRate = (fromCountry, toCountry) => {
    if (!fromCountry || !toCountry) return 0.85;
    const fromCurrency = fromCountry.currency_code || 'EUR';
    const toCurrency = toCountry.currency_code || 'EUR';
    
    const rateMap = {
      'EUR-USD': 1.08, 'USD-EUR': 0.93,
      'EUR-XOF': 655.96, 'XOF-EUR': 0.00152,
      'USD-XOF': 600.0, 'XOF-USD': 0.00167,
      'EUR-CFA': 655.96, 'CFA-EUR': 0.00152,
      'USD-CFA': 600.0, 'CFA-USD': 0.00167,
      'XOF-XOF': 1.0, 'EUR-EUR': 1.0, 'USD-USD': 1.0,
    };
    return rateMap[`${fromCurrency}-${toCurrency}`] || 0.85;
  };

  const isFormValid = () => {
    if (!formData.senderCountryId || !formData.receiverCountryId || 
        !formData.senderPhone?.trim() || !formData.receiverPhone?.trim() || 
        !formData.senderPaymentMethodId || !formData.receiverPaymentMethodId || 
        !formData.sentAmount) return false;

    const amount = parseFloat(formData.sentAmount);
    if (isNaN(amount) || amount <= 0 || amount < 1) return false;
    if (formData.senderCountryId === formData.receiverCountryId) return false;
    if (phoneValidation.sender.touched && !phoneValidation.sender.isValid) return false;
    if (phoneValidation.receiver.touched && !phoneValidation.receiver.isValid) return false;

    return true;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.senderCountryId) newErrors.senderCountryId = 'Sélectionnez le pays d\'envoi';
    if (!formData.receiverCountryId) newErrors.receiverCountryId = 'Sélectionnez le pays de réception';
    if (!formData.senderPhone?.trim()) newErrors.senderPhone = 'Numéro d\'envoi requis';
    if (!formData.receiverPhone?.trim()) newErrors.receiverPhone = 'Numéro de réception requis';
    if (!formData.senderPaymentMethodId) newErrors.senderPaymentMethodId = 'Sélectionnez le moyen d\'envoi';
    if (!formData.receiverPaymentMethodId) newErrors.receiverPaymentMethodId = 'Sélectionnez le moyen de réception';
    
    const amount = parseFloat(formData.sentAmount);
    if (!formData.sentAmount || isNaN(amount) || amount <= 0) {
      newErrors.sentAmount = 'Montant invalide';
    } else if (amount < 1) {
      newErrors.sentAmount = 'Le montant minimum est 1';
    }

    if (formData.senderCountryId && formData.receiverCountryId && 
        formData.senderCountryId === formData.receiverCountryId) {
      newErrors.receiverCountryId = 'Le pays de réception doit être différent du pays d\'envoi';
    }

    if (phoneValidation.sender.touched && !phoneValidation.sender.isValid) {
      newErrors.senderPhone = phoneValidation.sender.message;
    }
    if (phoneValidation.receiver.touched && !phoneValidation.receiver.isValid) {
      newErrors.receiverPhone = phoneValidation.receiver.message;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const formattedSenderPhone = senderCountry ? 
        formatPhoneWithPrefix(formData.senderPhone, senderCountry) : 
        formData.senderPhone.trim();
      
      const formattedReceiverPhone = receiverCountry ? 
        formatPhoneWithPrefix(formData.receiverPhone, receiverCountry) : 
        formData.receiverPhone.trim();

      // Structure des données selon ce que le backend attend
      const transactionData = {
        from_country_id: parseInt(formData.senderCountryId),
        to_country_id: parseInt(formData.receiverCountryId),
        sender_phone: formattedSenderPhone,
        receiver_phone: formattedReceiverPhone,
        sender_method_id: parseInt(formData.senderPaymentMethodId),
        receiver_method_id: parseInt(formData.receiverPaymentMethodId),
        send_amount: parseFloat(formData.sentAmount)
      };

      const res = await api.post('/transactions', transactionData);
      
      // La réponse est au format { success: true, data: { transaction: {...}, authorized_number, ... } }
      const responseData = res.data;
      
      if (responseData.success && responseData.data) {
        const transaction = responseData.data.transaction;
        const transactionId = transaction?.id;
        
        if (transactionId) {
          const encryptedId = encryptId(transactionId);
          if (encryptedId) {
            navigate(`/transaction/${encryptedId}`);
          } else {
            navigate(`/transaction/${transactionId}`);
          }
          return;
        }
      }
      
      // Fallback: essayer d'autres formats possibles
      if (responseData.data?.id) {
        const encryptedId = encryptId(responseData.data.id);
        navigate(`/transaction/${encryptedId || responseData.data.id}`);
        return;
      }
      
      if (responseData.id) {
        const encryptedId = encryptId(responseData.id);
        navigate(`/transaction/${encryptedId || responseData.id}`);
        return;
      }
      
      // Si tout échoue
      console.warn('Structure de réponse inattendue:', res.data);
      if (onTransactionComplete) {
        onTransactionComplete({
          ...res.data,
          sentAmount: formData.sentAmount,
          receivedAmount,
          exchangeRate
        });
      }
      
      const trackingCode = responseData.data?.tracking_code || responseData.tracking_code || 'N/A';
      alert(`Transaction créée ! Code suivi : ${trackingCode}`);
      handleReset();
      
    } catch (err) {
      console.error('❌ Erreur création transaction:', err);
      
      let errorMessage = 'Erreur lors de la création de la transaction';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setErrors({ general: errorMessage });
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      senderCountryId: '',
      senderPhone: '',
      senderPaymentMethodId: '',
      receiverCountryId: '',
      receiverPhone: '',
      receiverPaymentMethodId: '',
      sentAmount: ''
    });
    setReceivedAmount(0);
    setExchangeRate(0);
    setErrors({});
    setPhoneValidation({
      sender: { isValid: null, message: '', examples: [], touched: false, maxLength: 15 },
      receiver: { isValid: null, message: '', examples: [], touched: false, maxLength: 15 }
    });
  };

  const formatCurrency = (amount, currencyCode) => {
    if (!amount || amount === 0) return '0';
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode || 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      return `${amount} ${currencyCode || ''}`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Chargement des données...</p>
      </div>
    );
  }

  if (loadError && countries.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
        <p className="text-gray-600 mb-6">{loadError}</p>
        <button
          onClick={handleRetry}
          className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mx-auto"
        >
          <RefreshCw className="h-5 w-5" />
          <span>Réessayer</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-red-700 font-semibold">Erreur</p>
            <p className="text-red-600">{errors.general}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section Expéditeur */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Send className="h-5 w-5 text-blue-600 mr-2" />
              Expéditeur
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pays d'envoi *</label>
              <CountrySelect
                value={formData.senderCountryId}
                onChange={(value) => handleInputChange('senderCountryId', value)}
                countries={countries}
                error={errors.senderCountryId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numéro d'envoi *</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 text-sm font-medium">
                  {senderCountry?.phone_prefix || '+'}
                </span>
                <input
                  type="tel"
                  value={formData.senderPhone}
                  onChange={(e) => handlePhoneChange('senderPhone', e.target.value)}
                  placeholder={senderCountry ? getPhoneFormatExamples(null, senderCountry.phone_prefix)[0] : "123456789"}
                  maxLength={phoneValidation.sender.maxLength}
                  className={`w-full pl-20 pr-12 py-3 rounded-lg border transition-colors ${
                    errors.senderPhone 
                      ? 'border-red-300' 
                      : phoneValidation.sender.touched && !phoneValidation.sender.isValid
                      ? 'border-orange-300'
                      : phoneValidation.sender.isValid
                      ? 'border-green-300'
                      : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
                <div className="absolute right-3 top-3">
                  {phoneValidation.sender.touched && phoneValidation.sender.isValid && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  {phoneValidation.sender.touched && !phoneValidation.sender.isValid && formData.senderPhone && (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
              {errors.senderPhone && <p className="mt-1 text-sm text-red-600">{errors.senderPhone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moyen d'envoi *</label>
              <PaymentMethodSelect
                value={formData.senderPaymentMethodId}
                onChange={(value) => handleInputChange('senderPaymentMethodId', value)}
                paymentMethods={senderPaymentMethods}
                error={errors.senderPaymentMethodId}
                disabled={!formData.senderCountryId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Montant à envoyer *</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.sentAmount}
                  onChange={(e) => handleInputChange('sentAmount', e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className={`w-full px-4 py-3 pr-20 rounded-lg border ${
                    errors.sentAmount ? 'border-red-300' : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
                <span className="absolute right-3 top-3 text-gray-500 font-medium">
                  {senderCountry?.currency_code || 'EUR'}
                </span>
              </div>
              {errors.sentAmount && <p className="mt-1 text-sm text-red-600">{errors.sentAmount}</p>}
            </div>
          </div>

          {/* Flèche de séparation */}
          <div className="hidden md:flex items-center justify-center">
            <div className="bg-blue-50 rounded-full p-4">
              <ArrowRight className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* Section Bénéficiaire */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              Bénéficiaire
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pays de réception *</label>
              <CountrySelect
                value={formData.receiverCountryId}
                onChange={(value) => handleInputChange('receiverCountryId', value)}
                countries={countries}
                error={errors.receiverCountryId}
                excludeCountryId={formData.senderCountryId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de réception *</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 text-sm font-medium">
                  {receiverCountry?.phone_prefix || '+'}
                </span>
                <input
                  type="tel"
                  value={formData.receiverPhone}
                  onChange={(e) => handlePhoneChange('receiverPhone', e.target.value)}
                  placeholder={receiverCountry ? getPhoneFormatExamples(null, receiverCountry.phone_prefix)[0] : "123456789"}
                  maxLength={phoneValidation.receiver.maxLength}
                  className={`w-full pl-20 pr-12 py-3 rounded-lg border transition-colors ${
                    errors.receiverPhone 
                      ? 'border-red-300' 
                      : phoneValidation.receiver.touched && !phoneValidation.receiver.isValid
                      ? 'border-orange-300'
                      : phoneValidation.receiver.isValid
                      ? 'border-green-300'
                      : 'border-gray-300'
                  } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
                />
                <div className="absolute right-3 top-3">
                  {phoneValidation.receiver.touched && phoneValidation.receiver.isValid && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                  {phoneValidation.receiver.touched && !phoneValidation.receiver.isValid && formData.receiverPhone && (
                    <X className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
              {errors.receiverPhone && <p className="mt-1 text-sm text-red-600">{errors.receiverPhone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moyen de réception *</label>
              <PaymentMethodSelect
                value={formData.receiverPaymentMethodId}
                onChange={(value) => handleInputChange('receiverPaymentMethodId', value)}
                paymentMethods={receiverPaymentMethods}
                error={errors.receiverPaymentMethodId}
                disabled={!formData.receiverCountryId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Montant reçu</label>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    {receiverCountry ? formatCurrency(receivedAmount, receiverCountry.currency_code) : '0'}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">
                    {receiverCountry?.currency_code || ''}
                  </span>
                </div>
                {exchangeRate > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Taux: 1 {senderCountry?.currency_code} = {exchangeRate.toFixed(4)} {receiverCountry?.currency_code}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Résumé de la transaction */}
        {(formData.sentAmount && formData.sentAmount > 0 && formData.senderCountryId && formData.receiverCountryId) && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h5 className="font-semibold text-blue-900 mb-4 flex items-center">
              <Check className="h-5 w-5 mr-2" />
              Résumé de la transaction
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-4">
                <span className="text-gray-600 block mb-1">Envoyé:</span>
                <span className="font-semibold text-lg text-blue-900">
                  {senderCountry ? formatCurrency(parseFloat(formData.sentAmount), senderCountry.currency_code) : '0'}
                </span>
              </div>
              <div className="bg-white rounded-lg p-4">
                <span className="text-gray-600 block mb-1">Reçu:</span>
                <span className="font-semibold text-lg text-green-600">
                  {receiverCountry ? formatCurrency(receivedAmount, receiverCountry.currency_code) : '0'}
                </span>
              </div>
              <div className="bg-white rounded-lg p-4">
                <span className="text-gray-600 block mb-1">Frais:</span>
                <span className="font-semibold text-lg text-gray-900">
                  {senderCountry ? formatCurrency(0, senderCountry.currency_code) : '0'}
                </span>
                <p className="text-xs text-gray-500 mt-1">Aucun frais supplémentaire</p>
              </div>
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSubmitting}
            className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Réinitialiser
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
            className="flex-1 flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-300 shadow-lg"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Création en cours...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Initier le Transfert</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}