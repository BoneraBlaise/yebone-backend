/**
 * Product lifecycle states derived from catalog fields.
 */
class ProductLifecycle {
  static STATES = Object.freeze({
    DRAFT: "draft",
    ACTIVE: "active",
    OUT_OF_STOCK: "out_of_stock",
    FEATURED: "featured",
  });

  resolveState(product = {}) {
    if (Number(product.stock || 0) <= 0) {
      return ProductLifecycle.STATES.OUT_OF_STOCK;
    }
    if (product.featured || product.bestdeal) {
      return ProductLifecycle.STATES.FEATURED;
    }
    return ProductLifecycle.STATES.ACTIVE;
  }

  afterCreate(product) {
    return {
      state: this.resolveState(product),
      productId: product._id?.toString?.() || product.id,
    };
  }

  afterUpdate(product) {
    return this.afterCreate(product);
  }

  afterDelete(productId) {
    return { state: ProductLifecycle.STATES.DRAFT, productId };
  }
}

module.exports = ProductLifecycle;
