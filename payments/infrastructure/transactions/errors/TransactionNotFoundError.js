class TransactionNotFoundError extends Error {
  constructor(transactionId) {
    super(`Payment transaction not found: ${transactionId}`);
    this.name = "TransactionNotFoundError";
    this.transactionId = transactionId;
    this.statusCode = 404;
    this.code = "TRANSACTION_NOT_FOUND";
  }
}

module.exports = TransactionNotFoundError;
