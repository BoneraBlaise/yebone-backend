const BaseTool = require("./BaseTool");

/**
 * CatalogTool — product reads via ProductPlatform / ProductService.
 */
class CatalogTool extends BaseTool {
  constructor({ productPlatform, searchPlatform } = {}) {
    super({
      id: "catalog.product.get",
      name: "CatalogTool",
      version: "7.2.0",
      capabilities: [
        "product_lookup",
        "product_details",
        "product_metadata",
        "featured_products",
        "discounts",
      ],
      permissions: ["public"],
      platform: "ProductPlatform",
    });
    this.productPlatform = productPlatform;
    this.searchPlatform = searchPlatform;
  }

  health() {
    const base = super.health();
    return Object.freeze({
      ...base,
      healthy: base.healthy && Boolean(this.productPlatform?.catalog),
    });
  }

  _summarizeProduct(product = {}) {
    if (!product) return null;
    const pricing = this.productPlatform.pricing.getSummary(product);
    return {
      id: product._id?.toString?.() || product.id || null,
      name: product.name,
      description: product.description,
      category: product.category,
      tags: product.tags,
      shopId: product.shopId,
      shop: product.shop,
      images: product.images,
      stock: product.stock,
      sold_out: product.sold_out,
      ratings: product.ratings,
      featured: product.featured,
      bestdeal: product.bestdeal,
      pricing,
    };
  }

  async execute(input = {}, _context = {}) {
    if (!this.productPlatform) {
      throw new Error("CatalogTool requires ProductPlatform");
    }

    const action = String(input.action || "product_lookup").toLowerCase();

    if (action === "featured_products" || action === "featured") {
      if (!this.searchPlatform) {
        throw new Error("CatalogTool featured lookup requires SearchPlatform");
      }
      return this.searchPlatform.searchProducts({
        featured: true,
        limit: input.limit || 12,
        page: input.page || 1,
        sort: input.sort || "newest",
      });
    }

    if (action === "discounts" || action === "discounted") {
      if (!this.searchPlatform) {
        throw new Error("CatalogTool discount lookup requires SearchPlatform");
      }
      return this.searchPlatform.searchProducts({
        discounted: true,
        limit: input.limit || 12,
        page: input.page || 1,
        sort: input.sort || "newest",
      });
    }

    if (action === "list_by_shop" || action === "shop_products") {
      const products = await this.productPlatform.catalog.listByShop(input.shopId);
      return {
        products: (products || []).map((product) => this._summarizeProduct(product)),
        meta: { shopId: input.shopId, count: (products || []).length },
      };
    }

    const productId = input.productId || input.id;
    if (!productId) {
      const error = new Error("CatalogTool requires productId");
      error.statusCode = 400;
      error.code = "MISSING_PRODUCT_ID";
      throw error;
    }

    const product = await this.productPlatform.catalog.getById(productId);
    return {
      product: this._summarizeProduct(product),
      metadata: this.productPlatform.analytics.getSummary(product),
    };
  }
}

module.exports = CatalogTool;
