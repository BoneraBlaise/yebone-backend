/**
 * Registry of marketplace capabilities — frozen feature set for Marketplace Core v1.
 */
class MarketplaceFeatureRegistry {
  constructor() {
    this.features = Object.freeze({
      auth: { enabled: true, phase: "core" },
      users: { enabled: true, phase: "core" },
      shops: { enabled: true, phase: "core" },
      products: { enabled: true, phase: "core" },
      orders: { enabled: true, phase: "core" },
      events: { enabled: true, phase: "core" },
      coupons: { enabled: true, phase: "core" },
      flashSales: { enabled: true, phase: "core" },
      auctions: { enabled: true, phase: "core" },
      affiliate: { enabled: true, phase: "core" },
      messaging: { enabled: true, phase: "core" },
      admin: { enabled: true, phase: "core" },
      paymentHooks: { enabled: true, phase: "core" },
      search: { enabled: true, phase: "core" },
      notifications: { enabled: false, phase: "future" },
      inventoryRedesign: { enabled: false, phase: "future" },
      categoriesRedesign: { enabled: false, phase: "future" },
      delivery: { enabled: true, phase: "core" },
      ai: { enabled: true, phase: "core" },
    });
  }

  isEnabled(featureKey) {
    return this.features[featureKey]?.enabled === true;
  }

  listEnabled() {
    return Object.entries(this.features)
      .filter(([, value]) => value.enabled)
      .map(([key]) => key);
  }
}

module.exports = MarketplaceFeatureRegistry;
