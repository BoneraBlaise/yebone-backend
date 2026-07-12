const Shop = require("../../../model/shop");
const Withdraw = require("../../../model/withdraw");
const { delegateToFacade } = require("./LegacyFacadeDelegate");

/**
 * Legacy v2 withdraw adapter.
 * Delegates payout and wallet orchestration to MarketplacePaymentFacade.
 * MongoDB persistence is retained for backwards compatibility (no schema changes).
 *
 * @deprecated Internal adapter — prefer /api/v1/payments vendor payout routes for new integrations.
 */
class V2WithdrawAdapter {
  static async createWithdrawRequest({ seller, amount }) {
    const vendorId = String(seller._id);
    const payoutId = `legacy-withdraw-${Date.now()}`;

    await delegateToFacade("wallet", {
      action: "reserve",
      ownerId: vendorId,
      ownerType: "vendor",
      amount,
      currency: "RWF",
      referenceId: payoutId,
      metadata: { source: "legacy_v2_withdraw_create" },
    });

    await delegateToFacade("vendorPayout", {
      action: "request",
      vendorId,
      payoutId,
      amount,
      currency: "RWF",
      metadata: { source: "legacy_v2_withdraw_create" },
    });

    const withdraw = await Withdraw.create({
      seller,
      amount,
    });

    const shop = await Shop.findById(seller._id);
    if (shop) {
      shop.availableBalance = shop.availableBalance - amount;
      await shop.save();
    }

    return {
      success: true,
      withdraw,
    };
  }

  static async updateWithdrawRequest({ withdrawId, sellerId, withdraw, seller }) {
    const vendorId = String(sellerId);

    await delegateToFacade("vendorPayout", {
      action: "approve",
      vendorId,
      payoutId: String(withdrawId),
      amount: withdraw.amount,
      currency: "RWF",
      metadata: { source: "legacy_v2_withdraw_approve" },
    });

    await delegateToFacade("vendorPayout", {
      action: "execute",
      vendorId,
      payoutId: String(withdrawId),
      amount: withdraw.amount,
      currency: "RWF",
      metadata: { source: "legacy_v2_withdraw_execute" },
    });

    const transection = {
      _id: withdraw._id,
      amount: withdraw.amount,
      updatedAt: withdraw.updatedAt,
      status: withdraw.status,
    };

    seller.transections = [...seller.transections, transection];
    await seller.save();

    return {
      success: true,
      withdraw,
    };
  }
}

module.exports = V2WithdrawAdapter;
