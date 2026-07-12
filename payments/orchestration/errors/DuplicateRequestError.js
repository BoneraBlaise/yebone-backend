class DuplicateRequestError extends Error {
  constructor(idempotencyKey) {
    super(`Duplicate request detected for key: ${idempotencyKey}`);
    this.name = "DuplicateRequestError";
    this.idempotencyKey = idempotencyKey;
  }
}

module.exports = DuplicateRequestError;
