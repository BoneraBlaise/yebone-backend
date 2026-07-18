/**
 * Product category and tag helpers.
 */
class ProductCategories {
  normalize(input = {}) {
    return {
      category: String(input.category || "").trim(),
      tags: String(input.tags || "").trim(),
    };
  }

  validate(input = {}) {
    if (!input.category || !String(input.category).trim()) {
      return { valid: false, reason: "MISSING_CATEGORY" };
    }
    return { valid: true };
  }

  getSummary(product = {}) {
    return {
      category: product.category || null,
      tags: product.tags || null,
    };
  }
}

module.exports = ProductCategories;
