import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
  Send, ArrowRight, Check, AlertCircle, RefreshCw, X, ChevronDown, CheckCircle
} from 'lucide-react';
import {
  validatePhoneNumber,
  getPhoneFormatExamples,
  formatPhoneWithPrefix
} from '../../utils/phoneValidator';

// ─── CountrySelect ───────────────────────────────────────────────────────────
const CountrySelect = ({ value, onChange, countries, error, placeholder = "Sélectionner un pays", excludeCountryId = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCountry = countries.find(c => c.id === parseInt(value));
  const filteredCountries = excludeCountryId
    ? countries.filter(c => c.id !== parseInt(excludeCountryId))
    : countries;

  const getFlag = (name) => {
    if (!name) return '/flags/default.png';
    const clean = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `/flags/${clean}.png`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 rounded-lg border transition-colors text-left flex items-center justify-between bg-white ${
          error ? 'border-red-300' : 'border-gray-300 focus:border-blue-500'
        } focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
      >
        <div className="flex items-center space-x-3">
          {selectedCountry ? (
            <>
              <img src={getFlag(selectedCountry.name)} alt="" className="w-6 h-4 object-cover rounded-sm" onError={e => { e.target.style.display = 'none'; }} />
              <span>{selectedCountry.name} ({selectedCountry.currency_code}) — {selectedCountry.phone_prefix}</span>
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
                className={`flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${value === country.id.toString() ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                <img src={getFlag(country.name)} alt="" className="w-6 h-4 object-cover rounded-sm" onError={e => { e.target.style.display = 'none'; }} />
                <span>{country.name} ({country.currency_code}) — {country.phone_prefix}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

// ─── PaymentMethodSelect ──────────────────────────────────────────────────────
const PaymentMethodSelect = ({ value, onChange, paymentMethods, error, placeholder = "Sélectionner un moyen de paiement", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedMethod = paymentMethods.find(m => m.id === parseInt(value));

  const getMethodImage = (name) => {
    if (!name) return '/payment-methods/default.png';
    const map = {
      'orange money': '/payment-methods/orange-money.png',
      'mtn money': '/payment-methods/mtn-money.png',
      'wave': '/payment-methods/wave.png',
      'airtel money': '/payment-methods/airtel-money.png',
      'momo': '/payment-methods/momo.png',
      'alpha bank': '/payment-methods/alpha-bank.png',
      'sberbank': '/payment-methods/sberbank.png',
      'tinkoff': '/payment-methods/tinkoff.png',
    };
    return map[name.toLowerCase()] || `/payment-methods/${name.toLowerCase().replace(/\s+/g, '-')}.png`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-lg border transition-colors text-left flex items-center justify-between ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'
        } ${error ? 'border-red-300' : 'border-gray-300 focus:border-blue-500'} focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20`}
      >
        <div className="flex items-center space-x-3">
          {selectedMethod ? (
            <>
              <img src={getMethodImage(selectedMethod.method)} alt="" className="w-6 h-6 object-contain rounded-sm" onError={e => { e.target.style.display = 'none'; }} />
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
                  className={`flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${value === method.id.toString() ? 'bg-blue-50 text-blue-600' : ''}`}
                >
                  <img src={getMethodImage(method.method)} alt="" className="w-6 h-6 object-contain rounded-sm" onError={e => { e.target.style.display = 'none'; }} />
                  <span>{method.method}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-500 text-center">Aucun moyen de paiement disponible</div>
            )}
          </div>
        </>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

// ─── SuccessBanner ────────────────────────────────────────────────────────────
const SuccessBanner = ({ result, onClose }) => (
  <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
        <p className="text-green-800 font-semibold text-lg">Transaction créée avec succès !</p>
      </div>
      <button onClick={onClose} className="text-green-600 hover:text-green-800 transition-colors">
        <X className="h-5 w-5" />
      </button>
    </div>
    {result && (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        {result.tracking_code && (
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <span className="text-xs text-gray-500 block mb-1">Code de suivi</span>
            <span className="font-mono font-semibold text-gray-900">{result.tracking_code}</span>
          </div>
        )}
        {result.send_amount != null && (
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <span className="text-xs text-gray-500 block mb-1">Montant envoyé</span>
            <span className="font-semibold text-blue-700">{result.send_amount}</span>
          </div>
        )}
        {result.receive_amount != null && (
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <span className="text-xs text-gray-500 block mb-1">Montant reçu</span>
            <span className="font-semibold text-green-700">{result.receive_amount}</span>
          </div>
        )}
        {result.status && (
          <div className="bg-white rounded-lg p-3 border border-green-100">
            <span className="text-xs text-gray-500 block mb-1">Statut</span>
            <span className="font-semibold text-gray-800 capitalize">{result.status}</span>
          </div>
        )}
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AgentCreate() {
  const [formData, setFormData] = useState({
    senderCountryId: '',
    senderPhone: '',
    senderPaymentMethodId: '',
    receiverCountryId: '',
    receiverPhone: '',
    receiverPaymentMethodId: '',
    sentAmount: '',
  });

  const [receivedAmount, setReceivedAmount] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  const [countries, setCountries] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [phoneValidation, setPhoneValidation] = useState({
    sender: { isValid: null, message: '', touched: false, maxLength: 15 },
    receiver: { isValid: null, message: '', touched: false, maxLength: 15 },
  });

  // ── Fetch countries & payment methods ──
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setLoadError('');

      const res = await api.get('/countries');
      const countriesData = res.data.data || res.data;
      if (!Array.isArray(countriesData) || countriesData.length === 0) throw new Error('Aucun pays disponible');
      setCountries(countriesData);

      const methodsByCountry = {};
      await Promise.allSettled(
        countriesData.map(async (country) => {
          try {
            const r = await api.get(`/payment-methods/country/${country.id}`);
            methodsByCountry[country.id] = r.data.data || r.data || [];
          } catch {
            methodsByCountry[country.id] = [];
          }
        })
      );
      setPaymentMethods(methodsByCountry);
    } catch (err) {
      setLoadError(err.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Phone validation effects ──
  useEffect(() => {
    if (formData.senderPhone && formData.senderCountryId) {
      const country = getCountryById(formData.senderCountryId);
      if (country?.phone_prefix) {
        const v = validatePhoneNumber(formData.senderPhone, null, country.phone_prefix);
        setPhoneValidation(prev => ({ ...prev, sender: { ...v, touched: true, maxLength: v.maxLength || 15 } }));
      }
    } else {
      setPhoneValidation(prev => ({ ...prev, sender: { isValid: null, message: '', touched: false, maxLength: 15 } }));
    }
  }, [formData.senderPhone, formData.senderCountryId]);

  useEffect(() => {
    if (formData.receiverPhone && formData.receiverCountryId) {
      const country = getCountryById(formData.receiverCountryId);
      if (country?.phone_prefix) {
        const v = validatePhoneNumber(formData.receiverPhone, null, country.phone_prefix);
        setPhoneValidation(prev => ({ ...prev, receiver: { ...v, touched: true, maxLength: v.maxLength || 15 } }));
      }
    } else {
      setPhoneValidation(prev => ({ ...prev, receiver: { isValid: null, message: '', touched: false, maxLength: 15 } }));
    }
  }, [formData.receiverPhone, formData.receiverCountryId]);

  // ── Exchange rate ──
  useEffect(() => {
    if (formData.sentAmount > 0 && formData.senderCountryId && formData.receiverCountryId) {
      const calc = async () => {
        try {
          const from = getCountryById(formData.senderCountryId);
          const to = getCountryById(formData.receiverCountryId);
          if (!from || !to) return;
          try {
            const r = await api.get(`/rates/active/pair/${from.currency_id}/${to.currency_id}`);
            const rate = parseFloat(r.data.data?.rate);
            if (!isNaN(rate)) { setExchangeRate(rate); setReceivedAmount(parseFloat(formData.sentAmount) * rate); return; }
          } catch { /* fallback */ }
          try {
            const r = await api.get('/rates/active');
            const rates = r.data.data || [];
            const found = rates.find(rt => rt.from_currency_id === from.currency_id && rt.to_currency_id === to.currency_id);
            if (found?.rate) { const rate = parseFloat(found.rate); setExchangeRate(rate); setReceivedAmount(parseFloat(formData.sentAmount) * rate); return; }
          } catch { /* fallback */ }
          const rate = getDefaultRate(from, to);
          setExchangeRate(rate); setReceivedAmount(parseFloat(formData.sentAmount) * rate);
        } catch { setExchangeRate(0); setReceivedAmount(0); }
      };
      calc();
    } else {
      setExchangeRate(0); setReceivedAmount(0);
    }
  }, [formData.sentAmount, formData.senderCountryId, formData.receiverCountryId]);

  // ── Helpers ──
  const getCountryById = (id) => countries.find(c => c.id === parseInt(id));
  const getMethodsByCountry = (id) => paymentMethods[id] || [];

  const getDefaultRate = (from, to) => {
    const map = {
      'EUR-USD': 1.08, 'USD-EUR': 0.93,
      'EUR-XOF': 655.96, 'XOF-EUR': 0.00152,
      'USD-XOF': 600.0, 'XOF-USD': 0.00167,
      'XOF-XOF': 1.0, 'EUR-EUR': 1.0, 'USD-USD': 1.0,
    };
    const key = `${from?.currency_code}-${to?.currency_code}`;
    return map[key] || 0.85;
  };

  const formatCurrency = (amount, code) => {
    if (!amount || amount === 0) return '0';
    try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: code || 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount); }
    catch { return `${amount} ${code || ''}`; }
  };

  const senderCountry = getCountryById(formData.senderCountryId);
  const receiverCountry = getCountryById(formData.receiverCountryId);
  const senderPaymentMethods = getMethodsByCountry(formData.senderCountryId);
  const receiverPaymentMethods = getMethodsByCountry(formData.receiverCountryId);

  // ── Handlers ──
  const handleInput = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (errors.general) setErrors(prev => ({ ...prev, general: '' }));
  };

  const handlePhone = (field, value) => {
    const clean = value.replace(/\D/g, '');
    const countryIdField = field === 'senderPhone' ? 'senderCountryId' : 'receiverCountryId';
    const country = getCountryById(formData[countryIdField]);
    let max = 15;
    if (country?.phone_prefix) {
      const v = validatePhoneNumber(clean, null, country.phone_prefix);
      max = typeof v.maxLength === 'number' ? v.maxLength : 15;
    }
    if (clean.length <= max) {
      setFormData(prev => ({ ...prev, [field]: clean }));
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isFormValid = () => {
    if (!formData.senderCountryId || !formData.receiverCountryId) return false;
    if (!formData.senderPhone?.trim() || !formData.receiverPhone?.trim()) return false;
    if (!formData.senderPaymentMethodId || !formData.receiverPaymentMethodId) return false;
    const amt = parseFloat(formData.sentAmount);
    if (isNaN(amt) || amt < 1) return false;
    if (formData.senderCountryId === formData.receiverCountryId) return false;
    if (phoneValidation.sender.touched && !phoneValidation.sender.isValid) return false;
    if (phoneValidation.receiver.touched && !phoneValidation.receiver.isValid) return false;
    return true;
  };

  const validate = () => {
    const e = {};
    if (!formData.senderCountryId) e.senderCountryId = "Sélectionnez le pays d'envoi";
    if (!formData.receiverCountryId) e.receiverCountryId = 'Sélectionnez le pays de réception';
    if (!formData.senderPhone?.trim()) e.senderPhone = "Numéro d'envoi requis";
    if (!formData.receiverPhone?.trim()) e.receiverPhone = 'Numéro de réception requis';
    if (!formData.senderPaymentMethodId) e.senderPaymentMethodId = "Sélectionnez le moyen d'envoi";
    if (!formData.receiverPaymentMethodId) e.receiverPaymentMethodId = 'Sélectionnez le moyen de réception';
    const amt = parseFloat(formData.sentAmount);
    if (!formData.sentAmount || isNaN(amt) || amt <= 0) e.sentAmount = 'Montant invalide';
    else if (amt < 1) e.sentAmount = 'Le montant minimum est 1';
    if (formData.senderCountryId && formData.senderCountryId === formData.receiverCountryId)
      e.receiverCountryId = "Le pays de réception doit être différent du pays d'envoi";
    if (phoneValidation.sender.touched && !phoneValidation.sender.isValid)
      e.senderPhone = phoneValidation.sender.message;
    if (phoneValidation.receiver.touched && !phoneValidation.receiver.isValid)
      e.receiverPhone = phoneValidation.receiver.message;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const resetForm = () => {
    setFormData({ senderCountryId: '', senderPhone: '', senderPaymentMethodId: '', receiverCountryId: '', receiverPhone: '', receiverPaymentMethodId: '', sentAmount: '' });
    setReceivedAmount(0); setExchangeRate(0); setErrors({});
    setPhoneValidation({
      sender: { isValid: null, message: '', touched: false, maxLength: 15 },
      receiver: { isValid: null, message: '', touched: false, maxLength: 15 },
    });
  };

  const handleReset = () => { resetForm(); setSuccessResult(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const senderPhone = senderCountry ? formatPhoneWithPrefix(formData.senderPhone, senderCountry) : formData.senderPhone.trim();
      const receiverPhone = receiverCountry ? formatPhoneWithPrefix(formData.receiverPhone, receiverCountry) : formData.receiverPhone.trim();

      const payload = {
        from_country_id: parseInt(formData.senderCountryId),
        to_country_id: parseInt(formData.receiverCountryId),
        sender_phone: senderPhone,
        receiver_phone: receiverPhone,
        sender_method_id: parseInt(formData.senderPaymentMethodId),
        receiver_method_id: parseInt(formData.receiverPaymentMethodId),
        send_amount: parseFloat(formData.sentAmount),
      };

      // Route agent : POST /transactions/agent-create (token requis via intercepteur axios)
      const res = await api.post('/transactions/agent-create', payload);

      if (res.data.success) {
        setSuccessResult(res.data.data);
        resetForm();
      } else {
        setErrors({ general: res.data.message || 'Erreur inconnue' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Erreur lors de la création de la transaction';
      setErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading / Error states ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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
        <button onClick={fetchData} className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mx-auto">
          <RefreshCw className="h-5 w-5" /><span>Réessayer</span>
        </button>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-6">

      {/* Bandeau de succès */}
      {successResult && (
        <SuccessBanner result={successResult} onClose={() => setSuccessResult(null)} />
      )}

      {/* Bandeau d'erreur général */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-700 font-semibold">Erreur</p>
            <p className="text-red-600">{errors.general}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Expéditeur ── */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Send className="h-5 w-5 text-blue-600 mr-2" />
              Expéditeur
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pays d'envoi *</label>
              <CountrySelect
                value={formData.senderCountryId}
                onChange={(v) => handleInput('senderCountryId', v)}
                countries={countries}
                error={errors.senderCountryId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numéro d'envoi *</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 text-sm font-medium">{senderCountry?.phone_prefix || '+'}</span>
                <input
                  type="tel"
                  value={formData.senderPhone}
                  onChange={(e) => handlePhone('senderPhone', e.target.value)}
                  placeholder={senderCountry ? getPhoneFormatExamples(null, senderCountry.phone_prefix)[0] : '123456789'}
                  maxLength={phoneValidation.sender.maxLength}
                  className={`w-full pl-20 pr-12 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                    errors.senderPhone ? 'border-red-300'
                    : phoneValidation.sender.touched && !phoneValidation.sender.isValid ? 'border-orange-300'
                    : phoneValidation.sender.isValid ? 'border-green-300'
                    : 'border-gray-300'
                  }`}
                />
                <div className="absolute right-3 top-3">
                  {phoneValidation.sender.touched && phoneValidation.sender.isValid && <Check className="h-5 w-5 text-green-500" />}
                  {phoneValidation.sender.touched && !phoneValidation.sender.isValid && formData.senderPhone && <X className="h-5 w-5 text-red-500" />}
                </div>
              </div>
              {errors.senderPhone && <p className="mt-1 text-sm text-red-600">{errors.senderPhone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moyen d'envoi *</label>
              <PaymentMethodSelect
                value={formData.senderPaymentMethodId}
                onChange={(v) => handleInput('senderPaymentMethodId', v)}
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
                  onChange={(e) => handleInput('sentAmount', e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className={`w-full px-4 py-3 pr-20 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${errors.sentAmount ? 'border-red-300' : 'border-gray-300'}`}
                />
                <span className="absolute right-3 top-3 text-gray-500 font-medium">{senderCountry?.currency_code || 'EUR'}</span>
              </div>
              {errors.sentAmount && <p className="mt-1 text-sm text-red-600">{errors.sentAmount}</p>}
            </div>
          </div>

          {/* ── Flèche ── */}
          <div className="hidden md:flex items-center justify-center">
            <div className="bg-blue-50 rounded-full p-4">
              <ArrowRight className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* ── Bénéficiaire ── */}
          <div className="space-y-4 md:col-start-2">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-2" />
              Bénéficiaire
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pays de réception *</label>
              <CountrySelect
                value={formData.receiverCountryId}
                onChange={(v) => handleInput('receiverCountryId', v)}
                countries={countries}
                error={errors.receiverCountryId}
                excludeCountryId={formData.senderCountryId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de réception *</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 text-sm font-medium">{receiverCountry?.phone_prefix || '+'}</span>
                <input
                  type="tel"
                  value={formData.receiverPhone}
                  onChange={(e) => handlePhone('receiverPhone', e.target.value)}
                  placeholder={receiverCountry ? getPhoneFormatExamples(null, receiverCountry.phone_prefix)[0] : '123456789'}
                  maxLength={phoneValidation.receiver.maxLength}
                  className={`w-full pl-20 pr-12 py-3 rounded-lg border transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 ${
                    errors.receiverPhone ? 'border-red-300'
                    : phoneValidation.receiver.touched && !phoneValidation.receiver.isValid ? 'border-orange-300'
                    : phoneValidation.receiver.isValid ? 'border-green-300'
                    : 'border-gray-300'
                  }`}
                />
                <div className="absolute right-3 top-3">
                  {phoneValidation.receiver.touched && phoneValidation.receiver.isValid && <Check className="h-5 w-5 text-green-500" />}
                  {phoneValidation.receiver.touched && !phoneValidation.receiver.isValid && formData.receiverPhone && <X className="h-5 w-5 text-red-500" />}
                </div>
              </div>
              {errors.receiverPhone && <p className="mt-1 text-sm text-red-600">{errors.receiverPhone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Moyen de réception *</label>
              <PaymentMethodSelect
                value={formData.receiverPaymentMethodId}
                onChange={(v) => handleInput('receiverPaymentMethodId', v)}
                paymentMethods={receiverPaymentMethods}
                error={errors.receiverPaymentMethodId}
                disabled={!formData.receiverCountryId}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Montant reçu (estimé)</label>
              <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    {receiverCountry ? formatCurrency(receivedAmount, receiverCountry.currency_code) : '0'}
                  </span>
                  <span className="text-sm text-gray-500 font-medium">{receiverCountry?.currency_code || ''}</span>
                </div>
                {exchangeRate > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Taux : 1 {senderCountry?.currency_code} = {exchangeRate.toFixed(4)} {receiverCountry?.currency_code}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Résumé ── */}
        {formData.sentAmount > 0 && formData.senderCountryId && formData.receiverCountryId && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h5 className="font-semibold text-blue-900 mb-4 flex items-center">
              <Check className="h-5 w-5 mr-2" />
              Résumé de la transaction
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-4">
                <span className="text-gray-600 block mb-1">Envoyé :</span>
                <span className="font-semibold text-lg text-blue-900">
                  {senderCountry ? formatCurrency(parseFloat(formData.sentAmount), senderCountry.currency_code) : '0'}
                </span>
              </div>
              <div className="bg-white rounded-lg p-4">
                <span className="text-gray-600 block mb-1">Reçu :</span>
                <span className="font-semibold text-lg text-green-600">
                  {receiverCountry ? formatCurrency(receivedAmount, receiverCountry.currency_code) : '0'}
                </span>
              </div>
              <div className="bg-white rounded-lg p-4">
                <span className="text-gray-600 block mb-1">Statut après création :</span>
                <span className="inline-flex items-center space-x-1 font-semibold text-blue-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>Validée automatiquement</span>
                </span>
                <p className="text-xs text-gray-500 mt-1">Transaction assignée à vous</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Actions ── */}
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
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                <span>Création en cours...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Créer la transaction</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}