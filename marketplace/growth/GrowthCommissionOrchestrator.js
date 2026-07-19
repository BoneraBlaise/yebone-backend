const { createCommissionEngine } = require("../../payments/infrastructure/commission");
const Commission = require("../../model/commission");
const GrowthLegacyAdapter = require("./GrowthLegacyAdapter");

class GrowthCommissionOrchestrator {
  constructor({ configStore, legacy = new GrowthLegacyAdapter(), analytics } = {}) {
    if (!configStore) throw new Error("GrowthCommissionOrchestrator requires configStore");
    this.configStore = configStore;
    this.legacy = legacy;
    this.analytics = analytics;
  }

  _buildEngine() {
    const rules = this.configStore.getCommissionRules();
    return createCommissionEngine({ rules });
  }

  async joinProgram(userId) {
    const CommissionService = require("../services/CommissionService");
    const service = new CommissionService();
    return service.joinProgram(userId);
  }

  async processOrderCommission(order, referralCode, session = null, options = {}) {
    if (!referralCode) return null;

    let query = Commission.findOne({ referralCode });
    if (session) query = query.session(session);
    const commission = await query;
    if (!commission) return null;

    const { engine } = this._buildEngine();
    let totalCommission = 0;
    const commissionUpdates = [];

    for (const item of order.cart || []) {
      const itemPrice = Number(item.price || item.discountPrice || item.originalPrice);
      const qty = Number(item.qty || 1);
      if (!itemPrice || !qty || !item.shopId) continue;

      const itemTotal = itemPrice * qty;
      const context = {
        grossAmount: itemTotal,
        vendorId: String(item.shopId),
        referrerId: referralCode,
        couponId: options.couponId || null,
        productId: item._id ? String(item._id) : null,
        categoryId: item.category || null,
      };

      let breakdown;
      try {
        const resolved = engine.resolve(context);
        if (!resolved.baseRule) continue;
        breakdown = engine.calculate({ grossAmount: itemTotal, resolved, currency: "RWF" });
      } catch (_error) {
        continue;
      }

      const commissionAmount = breakdown.referralCommission || 0;
      if (commissionAmount <= 0) continue;

      commissionUpdates.push({
        order: order._id,
        product: item._id,
        shop: item.shopId,
        amount: itemTotal,
        commission: commissionAmount,
        commissionRate: breakdown.ruleSnapshots?.referral?.[0]?.rate || null,
        status: "pending",
        rewardStatus: "pending",
        ruleUsed: breakdown.appliedRules?.referral?.[0] || breakdown.appliedRules?.base || null,
        referralUsed: referralCode,
        couponUsed: options.couponCode || null,
      });
      totalCommission += commissionAmount;
    }

    if (totalCommission <= 0) return commission;

    commission.sales.push(...commissionUpdates);
    commission.balance.pending += totalCommission;

    for (const update of commissionUpdates) {
      await commission.updateShopStats(update.shop, update.commission, "pending");
    }

    await commission.save(session ? { session } : undefined);
    if (this.analytics) this.analytics.recordCommissionCreation();
    return commission;
  }

  async settleOrderCommission(orderId, referralCode) {
    if (!referralCode) return null;
    const commission = await Commission.findOne({ referralCode });
    if (!commission) return null;

    let orderCommission = 0;
    const now = new Date();

    for (const sale of commission.sales) {
      if (sale.order.toString() === String(orderId) && sale.status === "pending") {
        sale.status = "paid";
        sale.rewardStatus = "approved";
        sale.approvalTimestamp = now;
        orderCommission += sale.commission;
        await commission.updateShopStats(sale.shop, sale.commission, "paid");
      }
    }

    if (orderCommission <= 0) return commission;

    commission.balance.pending = Math.max(0, commission.balance.pending - orderCommission);
    commission.balance.available += orderCommission;
    await commission.save();
    if (this.analytics) this.analytics.recordRewardApproval();
    return commission;
  }

  async cancelOrderCommission(orderId, referralCode, reason = "cancelled") {
    if (!referralCode) return null;
    const commission = await Commission.findOne({ referralCode });
    if (!commission) return null;

    for (const sale of commission.sales) {
      if (sale.order.toString() === String(orderId) && sale.status === "pending") {
        sale.status = "cancelled";
        sale.rewardStatus = reason === "refunded" ? "refunded" : "cancelled";
        commission.balance.pending = Math.max(0, commission.balance.pending - sale.commission);
      }
    }
    await commission.save();
    return commission;
  }
}

module.exports = GrowthCommissionOrchestrator;
