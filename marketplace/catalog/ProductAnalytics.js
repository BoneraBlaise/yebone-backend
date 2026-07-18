/**
 * Basic product analytics summary.
 */
class ProductAnalytics {
  constructor({ lifecycle, inventory, pricing, config }) {
    this.lifecycle = lifecycle;
    this.inventory = inventory;
    this.pricing = pricing;
    this.config = config;
  }

  getSummary(product = {}) {
    return {
      productId: product._id?.toString?.() || product.id || null,
      lifecycleState: this.lifecycle.resolveState(product),
      inventory: this.inventory.getSummary(product),
      pricing: this.pricing.getSummary(product),
      reviewCount: Array.isArray(product.reviews) ? product.reviews.length : 0,
      likeCount: Array.isArray(product.likes) ? product.likes.length : 0,
      rating: product.ratings || 0,
      analyticsEnabled: this.config.enableAnalytics,
    };
  }
}

module.exports = ProductAnalytics;
