/**
 * Product pricing helpers.
 */
class ProductPricing {
  getSummary(product = {}) {
    const discountPrice = Number(product.discountPrice || 0);
    const originalPrice =
      product.originalPrice === undefined ? null : Number(product.originalPrice);

    return {
      discountPrice,
      originalPrice,
      hasDiscount:
        originalPrice !== null && !Number.isNaN(originalPrice) && originalPrice > discountPrice,
      currency: "RWF",
    };
  }

  validate(input = {}) {
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
}

module.exports = ProductPricing;
