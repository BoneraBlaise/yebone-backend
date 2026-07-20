const ProductInventory = require("../catalog/ProductInventory");

class SellerOperationsCatalogBridge {
  constructor({ useMemoryOnly = false, productSnapshots = null } = {}) {
    this.useMemoryOnly = useMemoryOnly;
    this.productSnapshots = productSnapshots || new Map();
    this.inventory = new ProductInventory();
  }

  _getProductPlatform() {
    try {
      const { getProductPlatform } = require("../index");
      return getProductPlatform();
    } catch (_error) {
      return null;
    }
  }

  async getProduct(productId) {
    if (this.useMemoryOnly) {
      return this.productSnapshots.get(String(productId)) || null;
    }
    try {
      const core = require("../index").getMarketplaceCore();
      return core.services.product.getProductById(productId);
    } catch (_error) {
      return null;
    }
  }

  async updateCatalogStock(productId, stock, options = {}) {
    if (this.useMemoryOnly) {
      const existing = this.productSnapshots.get(String(productId)) || {
        _id: productId,
        stock: 0,
        discountPrice: 0,
        name: "Test Product",
      };
      existing.stock = stock;
      this.productSnapshots.set(String(productId), existing);
      return existing;
    }

    const platform = this._getProductPlatform();
    if (platform) {
      return platform.updateProduct(productId, { stock }, options);
    }

    const Product = require("../../model/product");
    return Product.findByIdAndUpdate(productId, { stock }, { new: true }).lean();
  }

  async updateCatalogProduct(productId, patch, options = {}) {
    if (this.useMemoryOnly) {
      const existing = this.productSnapshots.get(String(productId)) || {
        _id: productId,
        stock: 0,
        discountPrice: 0,
        name: "Test Product",
      };
      Object.assign(existing, patch);
      this.productSnapshots.set(String(productId), existing);
      return existing;
    }

    const platform = this._getProductPlatform();
    if (platform) {
      return platform.updateProduct(productId, patch, options);
    }

    const Product = require("../../model/product");
    return Product.findByIdAndUpdate(productId, patch, { new: true }).lean();
  }

  getInventorySummary(product = {}) {
    return this.inventory.getSummary(product);
  }

  seedProduct(product) {
    this.productSnapshots.set(String(product._id || product.productId), structuredClone(product));
  }

  resetForTests() {
    this.productSnapshots.clear();
  }
}

module.exports = SellerOperationsCatalogBridge;
