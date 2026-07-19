const CouponValidationService = require("./CouponValidationService");
const GrowthLegacyAdapter = require("./GrowthLegacyAdapter");

class PromotionValidationService {
  constructor({ legacy = new GrowthLegacyAdapter(), couponValidator } = {}) {
    this.legacy = legacy;
    this.couponValidator = couponValidator || new CouponValidationService({ legacy });
  }

  async validate(input = {}) {
    const type = String(input.type || "coupon").toLowerCase();

    switch (type) {
      case "coupon":
        return this.couponValidator.validate(input);
      case "flash_sale":
        return this._validateFlashSale(input);
      case "event":
        return this._validateEvent(input);
      case "product_discount":
        return this._validateProductDiscount(input);
      default:
        return { valid: false, reason: "UNKNOWN_PROMOTION_TYPE" };
    }
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
}

module.exports = PromotionValidationService;
