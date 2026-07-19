class PromotionEngineService {
  async validatePromotion(input = {}) {
    const { getGrowthPlatform } = require("../growth");
    const growth = getGrowthPlatform();

    const typeMap = {
      percentage: "product_discount",
      fixed_amount: "product_discount",
      category: "category_promotion",
      brand: "brand_promotion",
      vendor: "vendor_promotion",
    };

    const mappedType = typeMap[input.discountType] || input.type || "product_discount";
    const payload = {
      ...input,
      type: mappedType,
      unified: Boolean(input.unified),
    };

    if (input.unified) {
      return growth.validatePromotion({ ...payload, unified: true });
    }
    return growth.validatePromotion(payload);
  }
}

module.exports = PromotionEngineService;
