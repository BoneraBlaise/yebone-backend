const GrowthLegacyAdapter = require("./GrowthLegacyAdapter");

class RewardLedgerService {
  constructor({ legacy = new GrowthLegacyAdapter() } = {}) {
    this.legacy = legacy;
  }

  async getLedgerForUser(userId, { limit = 100 } = {}) {
    const commission = await this.legacy.findCommissionByUserId(userId);
    if (!commission) {
      return { balance: { available: 0, pending: 0, total: 0 }, entries: [] };
    }

    const entries = [...(commission.sales || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map((sale) => ({
        orderId: sale.order,
        productId: sale.product,
        shopId: sale.shop,
        amount: sale.amount,
        commission: sale.commission,
        commissionRate: sale.commissionRate,
        status: this.legacy.mapToRewardStatus(sale.rewardStatus || sale.status),
        ruleUsed: sale.ruleUsed || null,
        referralUsed: sale.referralUsed || commission.referralCode,
        couponUsed: sale.couponUsed || null,
        approvalTimestamp: sale.approvalTimestamp || null,
        paymentReference: sale.paymentReference || null,
        walletReference: sale.walletReference || null,
        createdAt: sale.createdAt,
      }));

    return {
      referralCode: commission.referralCode,
      balance: {
        available: commission.balance.available,
        pending: commission.balance.pending,
        total: commission.balance.available + commission.balance.pending,
      },
      entries,
    };
  }
}

module.exports = RewardLedgerService;
