/**
 * Lightweight deterministic recommendation engine — Phase 7.5.
 * Uses only exposed product metadata; never invents scores.
 */
class RecommendationEngine {
  static RULES = Object.freeze([
    "availability",
    "price",
    "rating",
    "popularity",
    "completeness",
  ]);

  rank(products = [], options = {}) {
    const limit = Math.max(1, Number(options.limit) || 5);
    const preferAffordable = Boolean(options.preferAffordable);
    const maxPrice = options.maxPrice ?? options.priceMax ?? null;
    const minPrice = options.minPrice ?? options.priceMin ?? null;

    if (!Array.isArray(products) || products.length === 0) {
      return Object.freeze({
        recommendations: [],
        rulesApplied: [],
        empty: true,
      });
    }

    const evaluated = products.map((product, sourceIndex) => {
      const entry = this._evaluate(product, { preferAffordable, maxPrice, minPrice });
      return { product, sourceIndex, ...entry };
    });

    evaluated.sort((a, b) => this._compare(a, b, { preferAffordable, maxPrice }));

    const recommendations = evaluated.slice(0, limit).map((entry, index) =>
      Object.freeze({
        rank: index + 1,
        product: entry.product,
        searchPreview: this.toPreview(entry.product),
        reasons: [...entry.reasons],
        signals: { ...entry.signals },
      })
    );

    return Object.freeze({
      recommendations,
      rulesApplied: this._rulesApplied(evaluated),
      empty: recommendations.length === 0,
    });
  }

  toPreview(product = {}) {
    const id = product._id?.toString?.() || product.id || null;
    return Object.freeze({
      id,
      name: product.name || null,
      discountPrice: product.discountPrice ?? product.price ?? null,
      images: product.images || (product.image ? [product.image] : []),
    });
  }

  _evaluate(product = {}, options = {}) {
    const reasons = [];
    const signals = {};
    const sortKeys = {
      inStock: 0,
      priceScore: 0,
      rating: 0,
      popularity: 0,
      completeness: 0,
    };

    const stock = product.stock ?? product.quantity ?? product.inStock;
    const inStock = stock === true || (typeof stock === "number" && stock > 0);
    signals.inStock = inStock;
    sortKeys.inStock = inStock ? 1 : 0;
    if (inStock) reasons.push("Available in stock");

    const price = product.discountPrice ?? product.price ?? null;
    if (price != null && Number.isFinite(Number(price))) {
      const numericPrice = Number(price);
      signals.price = numericPrice;

      if (options.maxPrice != null && numericPrice <= Number(options.maxPrice)) {
        sortKeys.priceScore = Number(options.maxPrice) - numericPrice;
        reasons.push(`Price RWF ${numericPrice} is within your budget`);
      } else if (options.preferAffordable) {
        sortKeys.priceScore = numericPrice > 0 ? 1 / numericPrice : 0;
        reasons.push(`Listed at RWF ${numericPrice}`);
      } else if (options.minPrice != null && numericPrice >= Number(options.minPrice)) {
        sortKeys.priceScore = numericPrice;
        reasons.push(`Price RWF ${numericPrice} meets your minimum`);
      } else {
        sortKeys.priceScore = numericPrice > 0 ? 1 / numericPrice : 0;
        reasons.push(`Listed at RWF ${numericPrice}`);
      }
    }

    const rating =
      product.averageRating ??
      product.rating ??
      product.ratings?.average ??
      product.ratingsAverage ??
      null;
    if (rating != null && Number.isFinite(Number(rating))) {
      const numericRating = Number(rating);
      signals.rating = numericRating;
      sortKeys.rating = numericRating;
      reasons.push(`Platform rating ${numericRating}`);
    }

    const featured = product.featured === true;
    const popularity =
      product.salesCount ?? product.orderCount ?? product.views ?? product.popularity ?? null;
    signals.featured = featured;
    if (featured) {
      sortKeys.popularity = 2;
      reasons.push("Featured on the platform");
    } else if (popularity != null && Number.isFinite(Number(popularity))) {
      const numericPopularity = Number(popularity);
      signals.popularity = numericPopularity;
      sortKeys.popularity = numericPopularity;
      reasons.push(`Popular with ${numericPopularity} recorded interactions`);
    }

    let completeness = 0;
    if (product.name) completeness += 0.25;
    if (price != null) completeness += 0.25;
    if (product.images?.length || product.image) completeness += 0.25;
    if (product.description || product.shortDescription) completeness += 0.25;
    signals.completeness = completeness;
    sortKeys.completeness = completeness;
    if (completeness >= 0.75) reasons.push("Complete product listing");

    if (reasons.length === 0) {
      reasons.push("Matches your current result set");
    }

    return { reasons, signals, sortKeys };
  }

  _compare(a, b, options = {}) {
    if (a.sortKeys.inStock !== b.sortKeys.inStock) {
      return b.sortKeys.inStock - a.sortKeys.inStock;
    }

    if (options.preferAffordable || options.maxPrice != null) {
      if (a.sortKeys.priceScore !== b.sortKeys.priceScore) {
        return b.sortKeys.priceScore - a.sortKeys.priceScore;
      }
    }

    if (a.sortKeys.rating !== b.sortKeys.rating) {
      return b.sortKeys.rating - a.sortKeys.rating;
    }

    if (a.sortKeys.popularity !== b.sortKeys.popularity) {
      return b.sortKeys.popularity - a.sortKeys.popularity;
    }

    if (a.sortKeys.completeness !== b.sortKeys.completeness) {
      return b.sortKeys.completeness - a.sortKeys.completeness;
    }

    return a.sourceIndex - b.sourceIndex;
  }

  _rulesApplied(evaluated = []) {
    const applied = new Set();
    for (const entry of evaluated) {
      if (entry.signals.inStock) applied.add("availability");
      if (entry.signals.price != null) applied.add("price");
      if (entry.signals.rating != null) applied.add("rating");
      if (entry.signals.featured || entry.signals.popularity != null) applied.add("popularity");
      if (entry.signals.completeness > 0) applied.add("completeness");
    }
    return RecommendationEngine.RULES.filter((rule) => applied.has(rule));
  }
}

module.exports = RecommendationEngine;
