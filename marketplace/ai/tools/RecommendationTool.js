const BaseTool = require("./BaseTool");
const RecommendationEngine = require("../recommendations/RecommendationEngine");

/**
 * RecommendationTool — ranks existing SearchTool / CatalogTool results (Phase 7.5).
 */
class RecommendationTool extends BaseTool {
  constructor({ searchTool, catalogTool, recommendationEngine } = {}) {
    super({
      id: "recommend.contextual",
      name: "RecommendationTool",
      version: "7.5.0",
      capabilities: ["recommendations", "candidate_composition"],
      permissions: ["public"],
      platform: "SearchTool+CatalogTool+RecommendationEngine",
    });
    this.searchTool = searchTool;
    this.catalogTool = catalogTool;
    this.recommendationEngine = recommendationEngine || new RecommendationEngine();
  }

  health() {
    const base = super.health();
    return Object.freeze({
      ...base,
      healthy: base.healthy && Boolean(this.searchTool) && Boolean(this.catalogTool),
      composedTools: ["search.products", "catalog.product.get"],
      engine: "RecommendationEngine",
    });
  }

  _extractSourceProducts(input = {}, context = {}) {
    if (Array.isArray(input.sourceProducts) && input.sourceProducts.length > 0) {
      return input.sourceProducts;
    }

    const session = context.sessionContext || {};
    if (Array.isArray(session.currentProducts) && session.currentProducts.length > 0) {
      return session.currentProducts;
    }

    const data = session.lastToolResult?.data || {};
    if (Array.isArray(data.products) && data.products.length > 0) {
      return data.products;
    }
    if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
      return data.recommendations
        .map((entry) => entry.product || entry.searchPreview)
        .filter(Boolean);
    }
    if (Array.isArray(data.candidates) && data.candidates.length > 0) {
      return data.candidates
        .map((entry) => entry.product || entry.searchPreview)
        .filter(Boolean);
    }

    return [];
  }

  _buildSearchInput(input = {}, context = {}) {
    const session = context.sessionContext || {};
    const searchRequest = input.searchRequest || session.lastSearchRequest || {};
    return {
      q: input.q || input.query || input.message || searchRequest.q || searchRequest.query,
      category: input.category || searchRequest.category,
      brand: input.brand || searchRequest.brand,
      limit: input.limit || searchRequest.limit || 8,
      page: input.page || searchRequest.page || 1,
      sort: input.sort || searchRequest.sort || "newest",
      inStock: input.inStock ?? searchRequest.inStock ?? true,
      minPrice: input.minPrice ?? searchRequest.minPrice ?? null,
      maxPrice: input.maxPrice ?? searchRequest.maxPrice ?? null,
    };
  }

  _inferAffordable(message = "") {
    return /\baffordable\b|\bcheaper\b|\bbudget\b|\bunder\b|\bbelow\b/i.test(String(message));
  }

  async execute(input = {}, context = {}) {
    if (!this.searchTool || !this.catalogTool) {
      throw new Error("RecommendationTool requires SearchTool and CatalogTool");
    }

    let products = this._extractSourceProducts(input, context);
    let searchMeta = null;
    let searchReused = products.length > 0;
    let searchExecuted = false;

    if (products.length === 0) {
      searchExecuted = true;
      const searchResult = await this.searchTool.execute(this._buildSearchInput(input, context), context);
      products = searchResult.products || [];
      searchMeta = searchResult.meta || null;
      searchReused = false;
    }

    const preferAffordable =
      input.preferAffordable ?? this._inferAffordable(input.message || context.message || "");
    const rankOptions = {
      limit: input.limit || 5,
      maxPrice: input.maxPrice ?? input.searchRequest?.maxPrice ?? context.sessionContext?.lastSearchRequest?.maxPrice,
      minPrice: input.minPrice ?? input.searchRequest?.minPrice ?? context.sessionContext?.lastSearchRequest?.minPrice,
      preferAffordable,
    };

    const enrichedProducts = [];
    for (const product of products.slice(0, Math.min(8, products.length))) {
      const productId = product._id?.toString?.() || product.id;
      if (!productId) {
        enrichedProducts.push(product);
        continue;
      }

      try {
        const detail = await this.catalogTool.execute(
          { action: "product_details", productId },
          context
        );
        enrichedProducts.push(detail.product || product);
      } catch (_err) {
        enrichedProducts.push(product);
      }
    }

    const engineResult = this.recommendationEngine.rank(enrichedProducts, rankOptions);
    const recommendations = engineResult.recommendations || [];

    return {
      recommendations,
      candidates: recommendations.map((entry) => ({
        rank: entry.rank,
        searchPreview: entry.searchPreview,
        product: entry.product,
        reasons: entry.reasons,
        signals: entry.signals,
        metadata: null,
      })),
      meta: {
        count: recommendations.length,
        empty: engineResult.empty,
        engine: "RecommendationEngine",
        rulesApplied: engineResult.rulesApplied,
        composedFrom: searchExecuted ? ["SearchTool", "CatalogTool", "RecommendationEngine"] : ["RecommendationEngine", "CatalogTool"],
        searchMeta,
        searchReused,
        searchExecuted,
        preferAffordable,
      },
    };
  }
}

module.exports = RecommendationTool;
