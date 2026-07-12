/**
 * Supported payment methods across providers.
 */
const PaymentMethod = Object.freeze({
  CARD: "CARD",
  MOBILE_MONEY: "MOBILE_MONEY",
  BANK: "BANK",
  WALLET: "WALLET",
  CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
});

module.exports = PaymentMethod;
