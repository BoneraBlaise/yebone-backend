/**
 * Product catalog read operations.
 */
class ProductCatalog {
  constructor({ productService }) {
    this.productService = productService;
  }

  async listByShop(shopId) {
    return this.productService.getProductsByShop(shopId);
  }

  async listAll() {
    return this.productService.getAllProducts();
  }

  async listAdmin() {
    return this.productService.getAllProductsAdmin();
  }

  async getById(productId) {
    return this.productService.findById(productId);
  }
}

module.exports = ProductCatalog;
