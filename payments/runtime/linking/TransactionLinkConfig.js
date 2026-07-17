/**
 * Transaction link layer configuration — mapping only, no business state.
 */
const TransactionLinkConfig = Object.freeze({
  collectionName: "payment_transaction_links",
  chargePath: Object.freeze({
    LEGACY: "legacy",
    FOUNDATION: "foundation",
  }),
});

module.exports = TransactionLinkConfig;
