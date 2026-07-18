const BaseTool = require("./BaseTool");

/**
 * RecommendationTool — composes SearchTool + CatalogTool (no AI recommendations).
 */
class RecommendationTool extends BaseTool {
  constructor({ searchTool, catalogTool } = {}) {
    super({
      id: "recommend.contextual",
      name: "RecommendationTool",
      version: "7.2.0",
      capabilities: ["recommendations", "candidate_composition"],
      permissions: ["public"],
      platform: "SearchTool+CatalogTool",
    });
    this.searchTool = searchTool;
    this.catalogTool = catalogTool;
  }

  health() {
    const base = super.health();
    return Object.freeze({
      ...base,
      healthy: base.healthy && Boolean(this.searchTool) && Boolean(this.catalogTool),
      composedTools: ["search.products", "catalog.product.get"],
    });
  }

  async execute(input = {}, context = {}) {
    if (!this.searchTool || !this.catalogTool) {
      throw new Error("RecommendationTool requires SearchTool and CatalogTool");
    }

    const searchResult = await this.searchTool.execute(
      {
        q: input.q || input.query || input.category || input.message,
        category: input.category,
        limit: input.limit || 8,
        page: input.page || 1,
        sort: input.sort || "newest",
        inStock: input.inStock ?? true,
      },
      context
    );

    const products = searchResult.products || [];
    const candidates = [];

    for (const product of products.slice(0, Math.min(5, products.length))) {
      const productId = product._id?.toString?.() || product.id;
      if (!productId) continue;

      try {
        const detail = await this.catalogTool.execute(
          { action: "product_details", productId },
          context
        );
        candidates.push({
          rank: candidates.length + 1,
          searchPreview: {
            id: productId,
            name: product.name,
            discountPrice: product.discountPrice,
            images: product.images,
          },
          product: detail.product,
          metadata: detail.metadata || null,
        });
      } catch (_err) {
        candidates.push({
          rank: candidates.length + 1,
          searchPreview: {
            id: productId,
            name: product.name,
            discountPrice: product.discountPrice,
            images: product.images,
          },
          product: null,
          metadata: { enrichmentSkipped: true },
        });
      }
    }

    return {
      candidates,
      meta: {
        count: candidates.length,
        composedFrom: ["SearchTool", "CatalogTool"],
        searchMeta: searchResult.meta || null,
      },
    };
  }
}

module.exports = RecommendationTool;
