/**
 * Product health probe — integrates with Marketplace Core without modifying core/.
 */
class ProductHealth {
  constructor(platform) {
    this.platform = platform;
  }

  check() {
    return Object.freeze({
      healthy: Boolean(this.platform.marketplaceCore && this.platform.productService),
      version: this.platform.config.version,
      name: this.platform.config.name,
      marketplaceIntegrated: Boolean(this.platform.marketplaceCore),
      productServiceReady: Boolean(this.platform.productService),
      searchPrepEnabled: this.platform.config.enableSearchPrep,
    });
  }
}

module.exports = ProductHealth;
