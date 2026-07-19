const Commission = require("../../model/commission");
const CoupounCode = require("../../model/coupounCode");
const FlashSale = require("../../model/flashsale");
const Event = require("../../model/event");
const Product = require("../../model/product");
const Order = require("../../model/order");

/**
 * Read-only adapters for legacy Guriraline growth data.
 */
class GrowthLegacyAdapter {
  async findCommissionByReferralCode(referralCode) {
    if (!referralCode) return null;
    return Commission.findOne({ referralCode });
  }

  async findCommissionByUserId(userId) {
    if (!userId) return null;
    return Commission.findOne({ user: userId });
  }

  async findCouponByName(name) {
    if (!name) return null;
    return CoupounCode.findOne({ name: String(name).trim() });
  }

  async findFlashSaleById(id) {
    if (!id) return null;
    return FlashSale.findById(id);
  }

  async findEventById(id) {
    if (!id) return null;
    return Event.findById(id);
  }

  async findProductById(id) {
    if (!id) return null;
    return Product.findById(id);
  }

  async findOrdersWithReferral(limit = 100) {
    return Order.find({ referralCode: { $ne: null } }).sort({ createdAt: -1 }).limit(limit);
  }

  normalizeLegacySaleStatus(status) {
    const normalized = String(status || "pending").toLowerCase();
    if (normalized === "paid") return "approved";
    return normalized;
  }

  mapToRewardStatus(legacyStatus) {
    const map = {
      pending: "pending",
      paid: "approved",
      approved: "approved",
      cancelled: "cancelled",
      refunded: "refunded",
    };
    return map[String(legacyStatus || "pending").toLowerCase()] || "pending";
  }
}

module.exports = GrowthLegacyAdapter;
