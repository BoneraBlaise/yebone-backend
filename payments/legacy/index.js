/**
 * Legacy payment migration layer.
 * Bridges v2 marketplace controllers to MarketplacePaymentFacade.
 */
module.exports = {
  PaymentFacadeRegistry: require("./PaymentFacadeRegistry"),
  adapters: {
    V2PaymentProcessAdapter: require("./adapters/V2PaymentProcessAdapter"),
    V2WithdrawAdapter: require("./adapters/V2WithdrawAdapter"),
    LegacyFacadeDelegate: require("./adapters/LegacyFacadeDelegate"),
  },
};
