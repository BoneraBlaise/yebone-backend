class TransactionStatusConflictError extends Error {
  constructor(transactionId, expectedStatus, actualStatus) {
    super(
      `Transaction ${transactionId} status conflict: expected ${expectedStatus}, found ${actualStatus}`
    );
    this.name = "TransactionStatusConflictError";
    this.transactionId = transactionId;
    this.expectedStatus = expectedStatus;
    this.actualStatus = actualStatus;
    this.statusCode = 409;
    this.code = "TRANSACTION_STATUS_CONFLICT";
  }
}

module.exports = TransactionStatusConflictError;
