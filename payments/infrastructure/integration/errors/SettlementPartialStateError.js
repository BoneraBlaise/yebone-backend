class SettlementPartialStateError extends Error {
  constructor(transactionId, details = {}) {
    super(
      `Partial settlement ledger state for ${transactionId} — manual compensation required before retry`
    );
    this.name = "SettlementPartialStateError";
    this.code = "SETTLEMENT_PARTIAL_STATE";
    this.transactionId = transactionId;
    this.details = details;
  }
}

module.exports = SettlementPartialStateError;
