/**
 * Vendor health probe — integrates with Marketplace Core without modifying core/.
 */
class VendorHealth {
  constructor(platform) {
    this.platform = platform;
  }

  check() {
    const enabledFeatures = this.platform.registry.listEnabled();
    const marketplaceAttached = Boolean(this.platform.marketplaceCore);

    return Object.freeze({
      healthy: marketplaceAttached && enabledFeatures.length > 0,
      version: this.platform.config.version,
      name: this.platform.config.name,
      enabledFeatures,
      marketplaceIntegrated: marketplaceAttached,
      shopServiceReady: Boolean(this.platform.shopService),
    });
  }
}

module.exports = VendorHealth;
