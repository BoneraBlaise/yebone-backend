/**
 * Session-scoped conversation memory — Phase 7.7.
 * Resolves references within the active conversation only; no persistent storage.
 */
class ConversationMemoryEngine {
  static REFERENCE_PATTERN =
    /\b(it|this one|that one|this product|that product|the first|the second|the third|1st|2nd|3rd|the cheaper one|what about the cheaper|compare the first two|first two|the vendor|the seller|the shop)\b/i;

  hasReference(message = "") {
    return ConversationMemoryEngine.REFERENCE_PATTERN.test(String(message || ""));
  }

  extractEntities(sessionContext = {}) {
    const recommendation = sessionContext.currentRecommendation || null;
    const recommendationProduct =
      recommendation?.product || recommendation?.searchPreview || null;

    return {
      search: sessionContext.currentSearch || sessionContext.lastSearchRequest || null,
      products: sessionContext.currentProducts || [],
      recommendation,
      recommendationProduct,
      comparison: sessionContext.currentComparison || [],
      checkout: sessionContext.currentCheckoutContext || null,
      vendor: sessionContext.currentVendor || null,
      activeProduct: sessionContext.currentProduct || recommendationProduct || null,
    };
  }

  _productPrice(product = {}) {
    return Number(
      product.discountPrice ??
        product.price ??
        product.pricing?.discountPrice ??
        Number.MAX_SAFE_INTEGER
    );
  }

  _normalizeProduct(product = {}) {
    if (!product) return null;
    return {
      ...product,
      _id: product._id?.toString?.() || product.id || product._id || null,
      id: product._id?.toString?.() || product.id || product._id || null,
      name: product.name || product.searchPreview?.name || null,
    };
  }

  resolve(message = "", sessionContext = {}) {
    const text = String(message || "").toLowerCase();
    const entities = this.extractEntities(sessionContext);
    const references = [];
    let resolvedProduct = null;
    let resolvedProducts = [];
    let resolvedVendor = null;
    let hit = false;
    let miss = false;

    if (/compare the first two|first two/i.test(text) && entities.products.length >= 2) {
      resolvedProducts = entities.products.slice(0, 2).map((product) => this._normalizeProduct(product));
      references.push("first_two");
      hit = true;
    }

    const ordinalMatch = text.match(/\b(the )?(first|second|third|1st|2nd|3rd)\b/);
    if (ordinalMatch && entities.products.length > 0 && !resolvedProducts.length) {
      const ordinal = ordinalMatch[2];
      const indexMap = { first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2 };
      const index = indexMap[ordinal];
      if (index != null && entities.products[index]) {
        resolvedProduct = this._normalizeProduct(entities.products[index]);
        references.push(ordinal);
        hit = true;
      }
    }

    if (/cheaper one|what about the cheaper/i.test(text) && entities.products.length > 0 && !resolvedProduct) {
      const sorted = [...entities.products].sort(
        (a, b) => this._productPrice(a) - this._productPrice(b)
      );
      resolvedProduct = this._normalizeProduct(sorted[0]);
      references.push("cheaper_one");
      hit = true;
    }

    if (/\b(it|that one|this one|this product|that product)\b/i.test(text) && !resolvedProduct) {
      const candidate =
        entities.activeProduct ||
        entities.recommendationProduct ||
        entities.checkout?.comparisons?.[0]?.product ||
        entities.checkout?.comparisons?.[0]?.preview ||
        entities.comparison?.[0]?.product ||
        entities.comparison?.[0]?.preview ||
        entities.products[0] ||
        null;
      if (candidate) {
        resolvedProduct = this._normalizeProduct(candidate);
        references.push("pronoun");
        hit = true;
      }
    }

    if (/\b(the vendor|the seller|the shop)\b/i.test(text)) {
      const candidate =
        entities.vendor ||
        entities.activeProduct?.shop ||
        entities.products.find((product) => product.shop)?.shop ||
        null;
      if (candidate) {
        resolvedVendor = candidate;
        references.push("vendor");
        hit = true;
      }
    }

    if (this.hasReference(message) && !hit) {
      miss = true;
    }

    return Object.freeze({
      hit,
      miss,
      references,
      resolvedProduct,
      resolvedProducts,
      resolvedVendor,
      entities,
      sufficient:
        hit &&
        (Boolean(resolvedProduct) || resolvedProducts.length > 0 || Boolean(resolvedVendor)),
      depth: sessionContext.turnCount || 0,
    });
  }

  inferIntentFromReference(message = "", resolution = {}, sessionContext = {}) {
    const text = String(message || "").toLowerCase();

    if (/warranty|does it have|specifications|details about|tell me about/i.test(text)) {
      return {
        intent: "catalog",
        toolStrategy: "execute",
        action: "product_details",
        mode: null,
      };
    }

    if (/can i buy|purchase now|buy today|available|availability/i.test(text)) {
      return {
        intent: "checkout",
        toolStrategy: "execute",
        action: "guide",
        mode: "availability",
      };
    }

    if (/compare|first two|cheaper|better value|which has/i.test(text)) {
      return {
        intent: "checkout",
        toolStrategy: "execute",
        action: "guide",
        mode: /better value|which has/i.test(text) ? "value" : "compare",
      };
    }

    if (/recommend/i.test(text)) {
      return {
        intent: "recommend",
        toolStrategy: "execute",
        action: "rank",
        mode: null,
      };
    }

    if (resolution.resolvedVendor) {
      return {
        intent: "vendor_lookup",
        toolStrategy: "execute",
        action: "shop_lookup",
        mode: null,
      };
    }

    return {
      intent: sessionContext.lastIntent || "commerce_chat",
      toolStrategy: "reuse",
      action: null,
      mode: null,
    };
  }

  buildContextPatch(
    sessionContext = {},
    { plan, products = [], recommendations = [], checkout = {} } = {}
  ) {
    const patch = {
      currentSearch: plan?.searchRequest || sessionContext.lastSearchRequest || null,
      currentProducts: products.length ? products : sessionContext.currentProducts || [],
      currentRecommendation: recommendations[0] || sessionContext.currentRecommendation || null,
      currentComparison: checkout.comparisons?.length
        ? checkout.comparisons
        : sessionContext.currentComparison || null,
      currentCheckoutContext: checkout.guidance?.length
        ? checkout
        : sessionContext.currentCheckoutContext || null,
    };

    if (recommendations[0]) {
      patch.currentProduct =
        recommendations[0].product || recommendations[0].searchPreview || sessionContext.currentProduct;
    } else if (products.length === 1) {
      patch.currentProduct = products[0];
    } else if (checkout.comparisons?.[0]) {
      patch.currentProduct = checkout.comparisons[0].product || checkout.comparisons[0].preview;
    } else if (plan?.memoryResolution?.resolvedProduct) {
      patch.currentProduct = plan.memoryResolution.resolvedProduct;
    }

    const focus = patch.currentProduct;
    if (focus?.shop) {
      patch.currentVendor = focus.shop;
    } else if (sessionContext.currentVendor) {
      patch.currentVendor = sessionContext.currentVendor;
    }

    if (plan?.memoryResolution?.references?.length) {
      patch.memoryReferences = [
        ...(sessionContext.memoryReferences || []),
        ...plan.memoryResolution.references,
      ].slice(-20);
    }

    return patch;
  }
}

module.exports = ConversationMemoryEngine;
