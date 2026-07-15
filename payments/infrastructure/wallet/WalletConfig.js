const WalletConfig = {
  version: "7.0.0-foundation",
  decimalPlaces: 2,
  defaultCurrency: "UGX",
  walletTypes: Object.freeze([
    "SELLER",
    "PLATFORM",
    "REFERRAL",
    "RESERVE",
    "PENDING_PAYOUT",
    "ESCROW",
    "BONUS",
    "PROMOTIONAL",
  ]),
  walletStates: Object.freeze(["ACTIVE", "FROZEN", "SUSPENDED", "CLOSED"]),
  ledgerAccountMap: Object.freeze({
    SELLER: { accountCode: "VENDOR_PAYABLE", ownerKey: "sellerId" },
    PLATFORM: { accountCode: "PLATFORM_REVENUE", ownerKey: "tenantId" },
    REFERRAL: { accountCode: "REFERRAL_COMMISSION", ownerKey: "referrerId" },
    RESERVE: { accountCode: "REFUND_RESERVE", ownerKey: "walletId" },
    PENDING_PAYOUT: { accountCode: "VENDOR_PAYABLE", ownerKey: "sellerId" },
    ESCROW: { accountCode: "MARKETPLACE_ESCROW", ownerKey: "buyerId", futureReady: true },
    BONUS: { accountCode: "LOYALTY_REWARDS", ownerKey: "walletId", futureReady: true },
    PROMOTIONAL: { accountCode: "PROMOTIONAL_CREDITS", ownerKey: "walletId", futureReady: true },
  }),
};

module.exports = WalletConfig;
