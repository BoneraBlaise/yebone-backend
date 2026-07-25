const { getConfigurationHistoryService } = require("./ConfigurationHistoryService");

class ConfigurationSimulatorService {
  simulateCommission({ orderAmount = 100000, categoryId = "phones", categoryCommissions = {}, referralRate = 5 } = {}) {
    const config = categoryCommissions[categoryId] || { percentage: 10, minFee: 0, maxFee: null, fixedFee: 0 };
    let platformRevenue = Number(config.fixedFee || 0);
    if (Number(config.percentage) > 0) {
      platformRevenue += orderAmount * (Number(config.percentage) / 100);
    }
    if (config.minFee) platformRevenue = Math.max(platformRevenue, Number(config.minFee));
    if (config.maxFee != null) platformRevenue = Math.min(platformRevenue, Number(config.maxFee));
    platformRevenue = Math.round(platformRevenue);
    const vendorRevenue = Math.max(orderAmount - platformRevenue, 0);
    const referralRevenue = Math.round(vendorRevenue * (Number(referralRate) / 100));
    return {
      orderAmount,
      categoryId,
      platformRevenue,
      vendorRevenue: Math.max(vendorRevenue - referralRevenue, 0),
      referralRevenue,
    };
  }

  simulateReferralPayouts({ orderAmount = 100000, referralSettings = {}, categoryId = "phones" } = {}) {
    const rate = Number(referralSettings?.categoryRates?.[categoryId] ?? 1);
    const commissionPayout = Math.round(orderAmount * (rate / 100));
    const capped = Math.min(
      commissionPayout,
      Number(referralSettings.commissionCap || commissionPayout)
    );
    const platformPayout = Math.max(orderAmount - capped, 0);
    return {
      orderAmount,
      commissionPayout: capped,
      vendorPayout: Math.round(orderAmount * 0.85),
      platformPayout: Math.round(platformPayout * 0.1),
      referralRate: rate,
    };
  }

  simulateAiRevenue({ aiProducts = {}, activeVendors = 120 } = {}) {
    const products = Object.values(aiProducts || {});
    const enabled = products.filter((item) => item?.enabled !== false);
    const monthly = enabled.reduce((sum, item) => sum + Number(item.monthlyPrice || 0), 0);
    const credits = enabled.reduce(
      (sum, item) => sum + Number(item.creditPrice || 0) * Number(item.creditsIncluded || 0),
      0
    );
    const monthlyRevenue = monthly * activeVendors + credits * 0.15;
    return {
      expectedMonthlyRevenue: Math.round(monthlyRevenue),
      expectedYearlyRevenue: Math.round(monthlyRevenue * 12),
      vendorAdoptionEstimate: Math.round(activeVendors * (enabled.length / Math.max(products.length, 1))),
      activeProducts: enabled.length,
    };
  }

  simulateDelivery({
    distanceKm = 5,
    isExpress = false,
    isHeavy = false,
    isNight = false,
    deliverySettings = {},
  } = {}) {
    const pricing = deliverySettings.pricing || deliverySettings;
    const baseFee = Number(pricing.baseFee || 2000);
    const perKm = Number(pricing.perKm || 500);
    const expressFee = isExpress ? Number(pricing.expressFee || 0) : 0;
    const heavyFee = isHeavy ? Number(pricing.heavyPackage || 0) : 0;
    const nightFee = isNight ? Number(pricing.nightFee || 0) : 0;
    const customerPays = baseFee + distanceKm * perKm + expressFee + heavyFee + nightFee;
    const platformFee = Math.round(customerPays * 0.15);
    const vendorReceives = Math.max(customerPays - platformFee, 0);
    const etaMinutes = isExpress ? 35 : 55 + distanceKm * 4;
    return {
      customerPays: Math.round(customerPays),
      vendorReceives: Math.round(vendorReceives),
      platformFee,
      etaEstimate: `${etaMinutes} min`,
      distanceKm,
    };
  }
}

class ConfigurationWorkflowService {
  constructor({ bridge, historyService } = {}) {
    this.bridge = bridge;
    this.history = historyService || getConfigurationHistoryService();
    this.simulators = new ConfigurationSimulatorService();
  }

  async getWorkflowState() {
    await this.bridge.initialize();
    return this.bridge.getWorkflowSnapshot();
  }

  async saveDraft(section, values, meta = {}) {
    return this.bridge.saveDraftSection(section, values, meta);
  }

  async publish(meta = {}, options = {}) {
    return this.bridge.publishDraft(meta, options);
  }

  async rollback(historyId, meta = {}) {
    return this.bridge.rollbackFromHistory(historyId, meta);
  }

  getSimulators() {
    return this.simulators;
  }
}

module.exports = {
  ConfigurationWorkflowService,
  ConfigurationSimulatorService,
};
