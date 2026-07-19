const CouponValidationService = require("./CouponValidationService");
const GrowthLegacyAdapter = require("./GrowthLegacyAdapter");

class PromotionValidationService {
  constructor({ legacy = new GrowthLegacyAdapter(), couponValidator } = {}) {
    this.legacy = legacy;
    this.couponValidator = couponValidator || new CouponValidationService({ legacy });
  }

  async validate(input = {}) {
    const type = String(input.type || "coupon").toLowerCase().replace(/-/g, "_");

    switch (type) {
      case "coupon":
        return this.couponValidator.validate(input);
      case "flash_sale":
        return this._validateFlashSale(input);
      case "event":
        return this._validateEvent(input);
      case "product_discount":
        return this._validateProductDiscount(input);
      case "brand_promotion":
        return this._validateBrandPromotion(input);
      case "category_promotion":
        return this._validateCategoryPromotion(input);
      case "vendor_promotion":
        return this._validateVendorPromotion(input);
      default:
        return { valid: false, reason: "UNKNOWN_PROMOTION_TYPE" };
    }
  }

  async validateUnified(input = {}) {
    const requested = Array.isArray(input.types)
      ? input.types
      : ["coupon", "flash_sale", "product_discount", "event", "brand_promotion", "category_promotion", "vendor_promotion"];

    const results = [];
    for (const type of requested) {
      const result = await this.validate({ ...input, type });
      results.push({ type, ...result });
      if (result.valid) {
        return { valid: true, promotion: result.promotion || result.coupon, matchedType: type, evaluations: results };
      }
    }

    return { valid: false, reason: "NO_VALID_PROMOTION", evaluations: results };
  }

  async _validateFlashSale(input = {}) {
    const flashSale = await this.legacy.findFlashSaleById(input.promotionId || input.id);
    if (!flashSale) return { valid: false, reason: "FLASH_SALE_NOT_FOUND" };
    if (!flashSale.isActive) return { valid: false, reason: "FLASH_SALE_INACTIVE" };
    if (flashSale.endTime && new Date(flashSale.endTime) < new Date()) {
      return { valid: false, reason: "FLASH_SALE_EXPIRED" };
    }
    if (flashSale.stockAvailable <= 0) return { valid: false, reason: "FLASH_SALE_OUT_OF_STOCK" };
    if (input.shopId && String(flashSale.shopId) !== String(input.shopId)) {
      return { valid: false, reason: "SHOP_NOT_ELIGIBLE" };
    }
    return {
      valid: true,
      promotion: {
        type: "flash_sale",
        id: String(flashSale._id),
        price: flashSale.flashSalePrice,
        originalPrice: flashSale.originalPrice,
        discountPercentage: flashSale.discountPercentage,
      },
    };
  }

  async _validateEvent(input = {}) {
    const event = await this.legacy.findEventById(input.promotionId || input.id);
    if (!event) return { valid: false, reason: "EVENT_NOT_FOUND" };
    if (event.status !== "Running") return { valid: false, reason: "EVENT_NOT_RUNNING" };
    const now = new Date();
    if (event.start_Date && new Date(event.start_Date) > now) {
      return { valid: false, reason: "EVENT_NOT_STARTED" };
    }
    if (event.Finish_Date && new Date(event.Finish_Date) < now) {
      return { valid: false, reason: "EVENT_ENDED" };
    }
    if (event.stock <= event.sold_out) return { valid: false, reason: "EVENT_OUT_OF_STOCK" };
    return {
      valid: true,
      promotion: {
        type: "event",
        id: String(event._id),
        price: event.discountPrice,
        originalPrice: event.originalPrice,
      },
    };
  }

  async _validateProductDiscount(input = {}) {
    const product = await this.legacy.findProductById(input.productId || input.id);
    if (!product) return { valid: false, reason: "PRODUCT_NOT_FOUND" };
    if (!product.discountPrice) return { valid: false, reason: "NO_DISCOUNT_PRICE" };
    const discountAmount = Math.max(0, Number(product.originalPrice || 0) - Number(product.discountPrice));
    return {
      valid: true,
      promotion: {
        type: "product_discount",
        id: String(product._id),
        price: product.discountPrice,
        originalPrice: product.originalPrice,
        discountAmount,
      },
    };
  }

  async _validateBrandPromotion(input = {}) {
    const brandId = input.brandId || input.brand;
    if (!brandId) return { valid: false, reason: "BRAND_REQUIRED" };
    const product = input.productId ? await this.legacy.findProductById(input.productId) : null;
    if (product) {
      const productBrand = product.tags || product.brand;
      if (productBrand && String(productBrand) !== String(brandId)) {
        return { valid: false, reason: "BRAND_NOT_ELIGIBLE" };
      }
    }
    return {
      valid: true,
      promotion: { type: "brand_promotion", brandId: String(brandId), productId: input.productId || null },
    };
  }

  async _validateCategoryPromotion(input = {}) {
    const categoryId = input.categoryId || input.category;
    if (!categoryId) return { valid: false, reason: "CATEGORY_REQUIRED" };
    const product = input.productId ? await this.legacy.findProductById(input.productId) : null;
    if (product && String(product.category) !== String(categoryId)) {
      return { valid: false, reason: "CATEGORY_NOT_ELIGIBLE" };
    }
    return {
      valid: true,
      promotion: { type: "category_promotion", categoryId: String(categoryId), productId: input.productId || null },
    };
  }

  async _validateVendorPromotion(input = {}) {
    const vendorId = input.vendorId || input.shopId;
    if (!vendorId) return { valid: false, reason: "VENDOR_REQUIRED" };
    const product = input.productId ? await this.legacy.findProductById(input.productId) : null;
    if (product && String(product.shopId) !== String(vendorId)) {
      return { valid: false, reason: "VENDOR_NOT_ELIGIBLE" };
    }
    return {
      valid: true,
      promotion: { type: "vendor_promotion", vendorId: String(vendorId), productId: input.productId || null },
    };
  }
}

module.exports = PromotionValidationService;
