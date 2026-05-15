const RateModel = require("../models/rate.model");
const CurrencyModel = require("../models/currency.model");

class RateService {
  // CREATE
  static async createRate(data, adminId) {
    const { from_currency_id, to_currency_id, rate, commission_percent, is_active } = data;

    if (from_currency_id === to_currency_id) {
      throw new Error("Les devises source et destination doivent être différentes");
    }

    const fromCurrency = await CurrencyModel.findById(from_currency_id);
    const toCurrency = await CurrencyModel.findById(to_currency_id);
    if (!fromCurrency || !toCurrency) {
      throw new Error("Devise source ou destination non trouvée");
    }

    const existing = await RateModel.existsForPair(from_currency_id, to_currency_id);
    if (existing) {
      throw new Error("Un taux existe déjà pour cette paire. Utilisez update à la place.");
    }

    const created = await RateModel.create({
      from_currency_id,
      to_currency_id,
      rate,
      commission_percent: commission_percent ?? 0.75,
      created_by: adminId,
    });

    if (is_active === false) {
      return await RateModel.toggleActive(created.id, false);
    }
    return created;
  }

  // UPDATE (existant)
  static async updateRate(id, data, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const existing = await RateModel.findById(id);
    if (!existing) throw new Error("Taux de change non trouvé");

    const updatedData = {
      rate: data.rate ?? existing.rate,
      commission_percent: data.commission_percent ?? existing.commission_percent,
      is_active: data.is_active ?? existing.is_active,
    };

    return await RateModel.update(id, updatedData);
  }

  // UPSERT (create or update) – logique métier
  static async upsertRate(data, adminId, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");

    const { from_currency_id, to_currency_id, rate, commission_percent, is_active } = data;

    if (from_currency_id === to_currency_id) {
      throw new Error("Les devises source et destination doivent être différentes");
    }

    const fromCurrency = await CurrencyModel.findById(from_currency_id);
    const toCurrency = await CurrencyModel.findById(to_currency_id);
    if (!fromCurrency || !toCurrency) {
      throw new Error("Devise source ou destination non trouvée");
    }

    const existing = await RateModel.existsForPair(from_currency_id, to_currency_id);
    if (existing) {
      // Update
      const updated = await RateModel.update(existing.id, {
        rate,
        commission_percent: commission_percent ?? 0.75,
        is_active: is_active ?? true,
      });
      return updated;
    } else {
      // Create
      const created = await RateModel.create({
        from_currency_id,
        to_currency_id,
        rate,
        commission_percent: commission_percent ?? 0.75,
        created_by: adminId,
      });
      if (is_active === false) {
        return await RateModel.toggleActive(created.id, false);
      }
      return created;
    }
  }

  // READ
  static async getAllRatesForAdmin(userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    return await RateModel.findAllForAdmin();
  }

  static async getActiveRates() {
    return await RateModel.findAllActive();
  }

  static async getRateById(id, userRole) {
    const rate = await RateModel.findById(id);
    if (!rate) throw new Error("Taux de change non trouvé");
    if (userRole !== "admin") throw new Error("Accès refusé");
    return rate;
  }

  static async getActiveRateByPair(from_currency_id, to_currency_id) {
    const rate = await RateModel.findActiveRate(from_currency_id, to_currency_id);
    if (!rate) throw new Error("Taux de change actif non trouvé pour cette paire");
    return rate;
  }

  static async getActiveRateByCodes(from_code, to_code) {
    const rate = await RateModel.findActiveRateByCode(from_code, to_code);
    if (!rate) throw new Error(`Taux actif non trouvé pour ${from_code} → ${to_code}`);
    return rate;
  }

  static async getActiveRatesByCountry(country_id) {
    return await RateModel.findActiveRatesByCountry(country_id);
  }

  static async getActiveRatesByCurrency(currency_id) {
    return await RateModel.findActiveRatesByCurrency(currency_id);
  }

  // TOGGLE ACTIVE
  static async toggleRateActive(id, is_active, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const rate = await RateModel.findById(id);
    if (!rate) throw new Error("Taux de change non trouvé");
    return await RateModel.toggleActive(id, is_active);
  }

  // SOFT DELETE
  static async softDeleteRate(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const rate = await RateModel.findById(id);
    if (!rate) throw new Error("Taux de change non trouvé");
    return await RateModel.softDelete(id);
  }

  // HARD DELETE
  static async hardDeleteRate(id, userRole) {
    if (userRole !== "admin") throw new Error("Accès refusé");
    const rate = await RateModel.findById(id);
    if (!rate) throw new Error("Taux de change non trouvé");
    await RateModel.hardDelete(id);
  }

  // CONVERSION
  static async convertAmount(from_currency_id, to_currency_id, amount) {
    if (amount <= 0) throw new Error("Le montant doit être supérieur à 0");
    const rate = await RateModel.findActiveRate(from_currency_id, to_currency_id);
    if (!rate) return null;

    const convertedAmount = amount * parseFloat(rate.rate);
    const commission = convertedAmount * (parseFloat(rate.commission_percent) / 100);
    const totalAmount = convertedAmount + commission;

    return {
      original_amount: parseFloat(amount),
      converted_amount: convertedAmount,
      commission_amount: commission,
      total_amount: totalAmount,
      rate_used: parseFloat(rate.rate),
      commission_percent: parseFloat(rate.commission_percent),
      admin_rate: parseFloat(rate.rate) + 0.20,
    };
  }
}

module.exports = RateService;