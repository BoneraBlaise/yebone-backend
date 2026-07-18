/**
 * Product validation helpers.
 */
class ProductValidation {
  static validateCreateInput(input = {}) {
    const missing = [];
    if (!input.name) missing.push("name");
    if (!input.description) missing.push("description");
    if (!input.category) missing.push("category");
    if (input.discountPrice === undefined || input.discountPrice === null) {
      missing.push("discountPrice");
    }
    if (input.stock === undefined || input.stock === null) missing.push("stock");
    if (!input.shopId) missing.push("shopId");

    if (missing.length) {
      return { valid: false, reason: "MISSING_FIELDS", fields: missing };
    }

    return { valid: true };
  }

  static validatePricing(input = {}) {
    const discount = Number(input.discountPrice);
    const original = input.originalPrice === undefined ? null : Number(input.originalPrice);

    if (Number.isNaN(discount) || discount < 0) {
      return { valid: false, reason: "INVALID_DISCOUNT_PRICE" };
    }

    if (original !== null && (Number.isNaN(original) || original < discount)) {
      return { valid: false, reason: "INVALID_ORIGINAL_PRICE" };
    }

    return { valid: true };
  }

  static validateInventory(input = {}) {
    const stock = Number(input.stock);
    if (Number.isNaN(stock) || stock < 0) {
      return { valid: false, reason: "INVALID_STOCK" };
    }
    return { valid: true };
  }

  static assertSellerOwnership(product = {}, sellerId) {
    if (!sellerId) {
      return { valid: false, reason: "MISSING_SELLER" };
    }
    if (String(product.shopId) !== String(sellerId)) {
      return { valid: false, reason: "NOT_OWNER" };
    }
    return { valid: true };
  }
}

module.exports = ProductValidation;
