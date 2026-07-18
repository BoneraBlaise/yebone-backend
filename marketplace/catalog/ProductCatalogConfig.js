/**
 * Product catalog configuration — frozen after product-catalog-v1.
 */
class ProductCatalogConfig {
  constructor(options = {}) {
    this.name = options.name || "Yebone Product Catalog";
    this.version = options.version || "1.0.0";
    this.defaultLocation = options.defaultLocation || "Kigali-Rwanda";
    this.enableSearchPrep = options.enableSearchPrep !== false;
    this.enableAnalytics = options.enableAnalytics !== false;
  }
}

module.exports = ProductCatalogConfig;
