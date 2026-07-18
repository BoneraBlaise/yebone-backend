const ProductCatalogConfig = require("./ProductCatalogConfig");
const ProductCatalog = require("./ProductCatalog");
const ProductLifecycle = require("./ProductLifecycle");
const ProductInventory = require("./ProductInventory");
const ProductPricing = require("./ProductPricing");
const ProductMedia = require("./ProductMedia");
const ProductCategories = require("./ProductCategories");
const ProductSearch = require("./ProductSearch");
const ProductValidation = require("./ProductValidation");
const ProductAnalytics = require("./ProductAnalytics");
const ProductHealth = require("./ProductHealth");
const ProductHooks = require("./ProductHooks");

/**
 * Product Platform composition root — integrates with Marketplace Core services.
 */
class ProductPlatform {
  constructor({ marketplaceCore, config } = {}) {
    if (!marketplaceCore) {
      throw new Error("ProductPlatform requires marketplaceCore");
    }

    this.marketplaceCore = marketplaceCore;
    this.config = new ProductCatalogConfig(config);
    this.validation = ProductValidation;
    this.lifecycle = new ProductLifecycle();
    this.inventory = new ProductInventory();
    this.pricing = new ProductPricing();
    this.categories = new ProductCategories();
    this.search = new ProductSearch({ config: this.config });

    this.productService = marketplaceCore.services.product;
    this.shopService = marketplaceCore.services.shop;

    if (!this.productService.shopService) {
      this.productService.shopService = this.shopService;
    }

    this.media = new ProductMedia({
      uploadService: marketplaceCore.services.upload,
    });

    this.catalog = new ProductCatalog({ productService: this.productService });
    this.analytics = new ProductAnalytics({
      lifecycle: this.lifecycle,
      inventory: this.inventory,
      pricing: this.pricing,
      config: this.config,
    });
    this.hooks = new ProductHooks({ lifecycle: this.lifecycle });
    this.health = new ProductHealth(this);
  }

  _assertValidCreate(input) {
    const createValidation = ProductValidation.validateCreateInput(input);
    if (!createValidation.valid) {
      const error = new Error(`Missing required fields: ${createValidation.fields.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }

    const pricingValidation = this.pricing.validate(input);
    if (!pricingValidation.valid) {
      const error = new Error("Invalid product pricing");
      error.statusCode = 400;
      throw error;
    }

    const inventoryValidation = this.inventory.validateStock(input);
    if (!inventoryValidation) {
      const error = new Error("Invalid product stock");
      error.statusCode = 400;
      throw error;
    }

    const categoryValidation = this.categories.validate(input);
    if (!categoryValidation.valid) {
      const error = new Error("Product category is required");
      error.statusCode = 400;
      throw error;
    }
  }

  async createProduct(input) {
    this._assertValidCreate(input);
    const product = await this.productService.createProduct(input);
    this.hooks.afterCreate(product);
    return product;
  }

  async updateProduct(productId, input, options = {}) {
    const product = await this.productService.updateProduct(productId, input, options);
    this.hooks.afterUpdate(product);
    return product;
  }

  async deleteProduct(productId, options = {}) {
    const result = await this.productService.deleteProduct(productId, options);
    this.hooks.afterDelete(productId);
    return result;
  }

  async addReview(input, authenticatedUserId) {
    const product = await this.productService.addOrUpdateReview(input, authenticatedUserId);
    this.hooks.afterReview(product);
    return product;
  }

  async toggleLike(productId, userId) {
    const result = await this.productService.toggleLike(productId, userId);
    this.hooks.afterLike({ productId, userId, liked: result.liked });
    return result;
  }
}

module.exports = ProductPlatform;
