/**
 * Categories of money movement in the marketplace ledger.
 */
const TransactionType = Object.freeze({
  ORDER_PAYMENT: "ORDER_PAYMENT",
  SUBSCRIPTION: "SUBSCRIPTION",
  PAYOUT: "PAYOUT",
  REFUND: "REFUND",
  ESCROW: "ESCROW",
  DELIVERY: "DELIVERY",
  PLATFORM_FEE: "PLATFORM_FEE",
});

module.exports = TransactionType;
