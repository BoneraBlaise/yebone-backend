/**
 * Deterministic checkout intelligence — Phase 7.6.
 * Read-only purchase guidance from exposed platform metadata only.
 */
class CheckoutIntelligenceEngine {
  static SIGNALS = Object.freeze([
    "availability",
    "price",
    "rating",
    "popularity",
    "vendor",
    "recommendation_reasons",
  ]);

  inferMode(message = "") {
    const text = String(message || "").toLowerCase();
    if (/available|in stock|can i buy|can i purchase|purchase now|buy today|buy this today|can i order/i.test(text)) {
      return "availability";
    }
    if (/compare|cheaper|cheaper overall|product a or| or product |which is cheaper|should i buy.* or /i.test(text)) {
      return "compare";
    }
    if (/better value|worth buying|worth it|gives me better value/i.test(text)) {
      return "value";
    }
    if (/should i buy|is it worth|which is better|which one is better/i.test(text)) {
      return "purchase";
    }
    return "guidance";
  }

  toPreview(product = {}) {
    const id = product._id?.toString?.() || product.id || null;
    return Object.freeze({
      id,
      name: product.name || null,
      discountPrice: product.discountPrice ?? product.price ?? product.pricing?.discountPrice ?? null,
      images: product.images || (product.image ? [product.image] : []),
    });
  }

  assessAvailability(product = {}) {
    const stock = product.stock ?? product.quantity ?? product.inStock;
    const soldOut = product.sold_out === true;
    const inStock = !soldOut && (stock === true || (typeof stock === "number" && stock > 0));
    const guidance = inStock
      ? ["Available in stock — you can proceed to purchase on the platform today."]
      : ["Not currently available based on catalog stock data."];

    return Object.freeze({
      available: inStock,
      stock: typeof stock === "number" ? stock : inStock ? 1 : 0,
      soldOut,
      guidance,
    });
  }

  evaluateProduct(product = {}, recommendationEntry = null) {
    const considerations = [];
    const signals = {};
    const availability = this.assessAvailability(product);
    signals.available = availability.available;
    considerations.push(...availability.guidance);

    const price =
      product.discountPrice ??
      product.price ??
      product.pricing?.discountPrice ??
      null;
    if (price != null && Number.isFinite(Number(price))) {
      signals.price = Number(price);
      considerations.push(`Listed at RWF ${Number(price)}`);
    }

    const rating =
      product.averageRating ??
      product.rating ??
      product.ratings?.average ??
      product.ratingsAverage ??
      null;
    if (rating != null && Number.isFinite(Number(rating))) {
      signals.rating = Number(rating);
      considerations.push(`Platform rating ${Number(rating)}`);
    }

    if (product.featured === true) {
      signals.featured = true;
      considerations.push("Featured on the platform");
    }

    const vendorName = product.shop?.name || product.vendor?.name || product.shopName || null;
    if (vendorName) {
      signals.vendor = vendorName;
      considerations.push(`Sold by ${vendorName}`);
    }

    if (recommendationEntry?.reasons?.length) {
      signals.recommendationReasons = [...recommendationEntry.reasons];
      considerations.push(`Recommendation context: ${recommendationEntry.reasons.slice(0, 2).join("; ")}`);
    }

    return Object.freeze({
      product,
      preview: this.toPreview(product),
      considerations,
      signals,
      availability,
    });
  }

  compareProducts(products = [], options = {}) {
    if (!Array.isArray(products) || products.length === 0) {
      return Object.freeze({
        comparisons: [],
        guidance: ["No products available to compare."],
        empty: true,
        mode: options.mode || "compare",
      });
    }

    const recommendationMap = new Map();
    for (const entry of options.recommendations || []) {
      const id = entry.product?._id?.toString?.() || entry.product?.id || entry.searchPreview?.id;
      if (id) recommendationMap.set(String(id), entry);
    }

    const evaluated = products.map((product) => {
      const id = product._id?.toString?.() || product.id;
      return this.evaluateProduct(product, id ? recommendationMap.get(String(id)) : null);
    });

    const ranked = [...evaluated].sort((a, b) => this._compareForCheckout(a, b, options.mode));

    const comparisons = ranked.map((entry, index) =>
      Object.freeze({
        rank: index + 1,
        product: entry.product,
        preview: entry.preview,
        considerations: [...entry.considerations],
        signals: { ...entry.signals },
        availability: entry.availability,
      })
    );

    const guidance = this._buildComparisonGuidance(comparisons, options.mode);
    return Object.freeze({
      comparisons,
      guidance,
      empty: comparisons.length === 0,
      mode: options.mode || "compare",
      winner: comparisons[0] || null,
    });
  }

  buildGuidance(products = [], options = {}) {
    const mode = options.mode || this.inferMode(options.message);
    if (products.length === 0) {
      return Object.freeze({
        guidance: ["No product context is available yet. Search or select a product first."],
        comparisons: [],
        availability: null,
        empty: true,
        mode,
      });
    }

    if (mode === "availability" && products.length === 1) {
      const availability = this.assessAvailability(products[0]);
      return Object.freeze({
        guidance: [...availability.guidance],
        comparisons: [],
        availability,
        empty: false,
        mode,
      });
    }

    const comparison = this.compareProducts(products, {
      mode,
      recommendations: options.recommendations || [],
    });

    return Object.freeze({
      guidance: comparison.guidance,
      comparisons: comparison.comparisons,
      availability: products.length === 1 ? this.assessAvailability(products[0]) : null,
      empty: comparison.empty,
      mode,
      winner: comparison.winner,
    });
  }

  _compareForCheckout(a, b, mode = "compare") {
    if (a.signals.available !== b.signals.available) {
      return a.signals.available ? -1 : 1;
    }

    if (mode === "value" || mode === "compare") {
      const priceA = a.signals.price ?? Number.MAX_SAFE_INTEGER;
      const priceB = b.signals.price ?? Number.MAX_SAFE_INTEGER;
      if (priceA !== priceB) return priceA - priceB;
    }

    const ratingA = a.signals.rating ?? 0;
    const ratingB = b.signals.rating ?? 0;
    if (ratingA !== ratingB) return ratingB - ratingA;

    if (a.signals.featured && !b.signals.featured) return -1;
    if (!a.signals.featured && b.signals.featured) return 1;

    return 0;
  }

  _buildComparisonGuidance(comparisons = [], mode = "compare") {
    if (comparisons.length === 0) return ["No products available to compare."];

    const winner = comparisons[0];
    const winnerName = winner.preview?.name || "the top option";
    const guidance = [];

    if (comparisons.length === 1) {
      guidance.push(...winner.considerations);
      return guidance;
    }

    if (mode === "value") {
      guidance.push(`${winnerName} offers better value based on current price and availability.`);
    } else if (mode === "compare") {
      guidance.push(`${winnerName} leads this comparison on price, availability, and exposed ratings.`);
    } else {
      guidance.push(`${winnerName} is the stronger buying option from the current result set.`);
    }

    guidance.push(...winner.considerations.slice(0, 3));
    if (comparisons[1]) {
      const runnerUp = comparisons[1].preview?.name || "the next option";
      guidance.push(`Alternative: ${runnerUp} — ${comparisons[1].considerations.slice(0, 2).join("; ")}`);
    }

    return guidance;
  }
}

module.exports = CheckoutIntelligenceEngine;
