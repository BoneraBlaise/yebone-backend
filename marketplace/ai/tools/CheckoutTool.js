const BaseTool = require("./BaseTool");
const CheckoutIntelligenceEngine = require("../checkout/CheckoutIntelligenceEngine");

/**
 * CheckoutTool — read-only purchase guidance before checkout (Phase 7.6).
 */
class CheckoutTool extends BaseTool {
  constructor({ catalogTool, checkoutEngine } = {}) {
    super({
      id: "checkout.guide",
      name: "CheckoutTool",
      version: "7.6.0",
      capabilities: ["checkout_guidance", "product_comparison", "purchase_readiness"],
      permissions: ["public"],
      platform: "CatalogTool+CheckoutIntelligenceEngine",
    });
    this.catalogTool = catalogTool;
    this.checkoutEngine = checkoutEngine || new CheckoutIntelligenceEngine();
  }

  health() {
    const base = super.health();
    return Object.freeze({
      ...base,
      healthy: base.healthy && Boolean(this.catalogTool),
      composedTools: ["catalog.product.get"],
      engine: "CheckoutIntelligenceEngine",
      readOnly: true,
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
    if (Array.isArray(data.comparisons) && data.comparisons.length > 0) {
      return data.comparisons.map((entry) => entry.product || entry.preview).filter(Boolean);
    }
    if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
      return data.recommendations.map((entry) => entry.product || entry.searchPreview).filter(Boolean);
    }
    if (Array.isArray(data.products) && data.products.length > 0) {
      return data.products;
    }
    if (session.currentProduct) {
      return [session.currentProduct];
    }

    return [];
  }

  _extractRecommendations(context = {}) {
    const session = context.sessionContext || {};
    const data = session.lastToolResult?.data || {};
    if (Array.isArray(data.recommendations)) return data.recommendations;
    return [];
  }

  async _enrichProducts(products = [], context = {}) {
    const enriched = [];
    for (const product of products.slice(0, Math.min(4, products.length))) {
      const productId = product._id?.toString?.() || product.id;
      if (!productId || !this.catalogTool) {
        enriched.push(product);
        continue;
      }
      try {
        const detail = await this.catalogTool.execute(
          { action: "product_details", productId },
          context
        );
        enriched.push(detail.product || product);
      } catch (_err) {
        enriched.push(product);
      }
    }
    return enriched;
  }

  async execute(input = {}, context = {}) {
    if (!this.catalogTool) {
      throw new Error("CheckoutTool requires CatalogTool");
    }

    let products = this._extractSourceProducts(input, context);
    const recommendations = this._extractRecommendations(context);
    const sourceReused = products.length > 0;
    const mode = input.mode || this.checkoutEngine.inferMode(input.message || context.message || "");

    if (products.length > 0) {
      products = await this._enrichProducts(products, context);
    }

    const result = this.checkoutEngine.buildGuidance(products, {
      message: input.message || context.message || "",
      mode,
      recommendations,
    });

    return {
      guidance: result.guidance,
      comparisons: result.comparisons || [],
      availability: result.availability || null,
      meta: {
        engine: "CheckoutIntelligenceEngine",
        mode: result.mode,
        empty: result.empty,
        sourceReused,
        readOnly: true,
        orderCreation: false,
        paymentExecution: false,
        inventoryModification: false,
        productCount: products.length,
      },
    };
  }
}

module.exports = CheckoutTool;
