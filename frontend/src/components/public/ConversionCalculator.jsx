import React, { useState, useEffect } from "react";
import { Calculator, ArrowUpDown, TrendingUp, Loader } from 'lucide-react';
import api from '../../api/axios';

export default function ConversionCalculator() {
  const [fromCountry, setFromCountry] = useState('');
  const [toCountry, setToCountry] = useState('');
  const [amount, setAmount] = useState(1000);
  const [result, setResult] = useState({
    convertedAmount: 0,
    rate: 0,
    commissionPercent: 0.75
  });
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCountries();
  }, []);

  // Route corrigée : GET /api/countries (retourne les pays actifs)
  const fetchCountries = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/countries');

      // La réponse est { success, data: [...], message }
      const data = response.data.success ? response.data.data : response.data;
      setCountries(data);

      if (data.length >= 2) {
        setFromCountry(data[0].id.toString());
        setToCountry(data[1].id.toString());
      }
    } catch (err) {
      console.error('Erreur fetchCountries:', err);
      setError(`Impossible de charger les pays: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Route corrigée : GET /api/rates/active/pair/:from_currency_id/:to_currency_id
  // Les currency_id sont directement dans les objets pays (champ currency_id)
  const calculateExchange = async (amount, fromCountryId, toCountryId) => {
    if (!fromCountryId || !toCountryId || !amount || amount <= 0) {
      return { convertedAmount: 0, rate: 0, commissionPercent: 0.75 };
    }

    const fromCountryData = getCountryById(fromCountryId);
    const toCountryData = getCountryById(toCountryId);

    if (!fromCountryData?.currency_id || !toCountryData?.currency_id) {
      return { convertedAmount: 0, rate: 0, commissionPercent: 0.75 };
    }

    try {
      setCalculating(true);
      setError('');

      const response = await api.get(
        `/rates/active/pair/${fromCountryData.currency_id}/${toCountryData.currency_id}`
      );

      // La réponse est { success, data: { rate, commission_percent, ... } }
      if (!response.data.success) {
        throw new Error(response.data.message || 'Taux de change non disponible');
      }

      const rateData = response.data.data;
      const rate = parseFloat(rateData.rate) || 0;
      const commissionPercent = parseFloat(rateData.commission_percent) || 0.75;

      // Calcul : on déduit la commission du montant envoyé, puis on applique le taux
      const amountAfterCommission = amount * (1 - commissionPercent / 100);
      const convertedAmount = amountAfterCommission * rate;

      return {
        convertedAmount,
        rate,
        commissionPercent,
        rawAmount: amount * rate
      };
    } catch (err) {
      console.error('Erreur calcul taux:', err);
      setError(`Taux non disponible: ${err.response?.data?.message || err.message}`);
      return { convertedAmount: 0, rate: 0, commissionPercent: 0.75 };
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    if (fromCountry && toCountry && amount > 0) {
      calculateExchange(amount, fromCountry, toCountry).then(setResult);
    }
  }, [amount, fromCountry, toCountry, countries]);

  const swapCurrencies = () => {
    setFromCountry(toCountry);
    setToCountry(fromCountry);
  };

  const getCountryById = (id) => {
    return countries.find(c => c.id.toString() === id.toString());
  };

  const formatCurrency = (amount, currencyCode) => {
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode
      }).format(amount);
    } catch {
      return `${amount.toLocaleString('fr-FR')} ${currencyCode}`;
    }
  };

  const formatRate = (rate) => {
    if (typeof rate !== 'number' || isNaN(rate)) return '0.0000';
    return rate.toFixed(4);
  };

  const fromCountryData = getCountryById(fromCountry);
  const toCountryData = getCountryById(toCountry);

  const commonAmounts = [500, 1000, 5000, 10000, 25000, 50000];

  if (loading && countries.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Chargement des pays...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h4 className="text-xl font-semibold text-gray-900 mb-2 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-blue-600 mr-2" />
          Calculatrice de Conversion
        </h4>
        <p className="text-gray-600">
          Calculez le montant exact que recevra votre bénéficiaire
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={fetchCountries}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Réessayer
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pays d'envoi */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays d'envoi
              </label>
              <select
                value={fromCountry}
                onChange={(e) => setFromCountry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="">Sélectionnez un pays</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name} ({country.currency_symbol || country.currency_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant à envoyer
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0"
                  min="1"
                  className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading || !fromCountryData}
                />
                <span className="absolute right-3 top-3 text-gray-500">
                  {fromCountryData?.currency_symbol || fromCountryData?.currency_code}
                </span>
              </div>
            </div>

            {/* Montants rapides */}
            <div className="grid grid-cols-3 gap-2">
              {commonAmounts.map(quickAmount => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount)}
                  disabled={loading || !fromCountryData}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Bouton swap */}
          <div className="md:flex md:items-center md:justify-center">
            <button
              onClick={swapCurrencies}
              disabled={loading || calculating || !fromCountry || !toCountry}
              className="w-full md:w-auto p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUpDown className="h-5 w-5 mx-auto" />
            </button>
          </div>

          {/* Pays de réception */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays de réception
              </label>
              <select
                value={toCountry}
                onChange={(e) => setToCountry(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="">Sélectionnez un pays</option>
                {countries
                  .filter(country => country.id.toString() !== fromCountry)
                  .map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name} ({country.currency_symbol || country.currency_code})
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant reçu
              </label>
              <div className="bg-green-50 px-4 py-3 rounded-lg border border-green-200">
                {calculating ? (
                  <div className="flex items-center justify-center">
                    <Loader className="h-5 w-5 animate-spin text-green-600 mr-2" />
                    <span className="text-green-600">Calcul...</span>
                  </div>
                ) : (
                  <span className="text-2xl font-bold text-green-600">
                    {toCountryData
                      ? formatCurrency(result.convertedAmount, toCountryData.currency_code)
                      : '0'}
                  </span>
                )}
              </div>
            </div>

            {/* Info taux */}
            {result.rate > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Taux de change</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  1 {fromCountryData?.currency_symbol || fromCountryData?.currency_code} ={' '}
                  {formatRate(result.rate)} {toCountryData?.currency_symbol || toCountryData?.currency_code}
                </p>
                {result.commissionPercent && (
                  <p className="text-xs text-gray-500 mt-1">
                    Commission: {result.commissionPercent}% incluse
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Avantages */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h5 className="font-semibold text-blue-900 mb-3">Avantages TransferBridge</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <p className="font-medium text-blue-800">Taux Compétitifs</p>
              <p className="text-blue-600">Meilleurs taux du marché</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-blue-800">Frais Transparents</p>
              <p className="text-blue-600">Commission de 0,75%</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-blue-800">Transfert Rapide</p>
              <p className="text-blue-600">En quelques minutes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}