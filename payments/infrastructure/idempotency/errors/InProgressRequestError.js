class InProgressRequestError extends Error {
  constructor(idempotencyKey) {
    super(`Request with idempotency key is still in progress: ${idempotencyKey}`);
    this.name = "InProgressRequestError";
    this.idempotencyKey = idempotencyKey;
    this.statusCode = 409;
    this.code = "IDEMPOTENCY_IN_PROGRESS";
  }
}

module.exports = InProgressRequestError;
