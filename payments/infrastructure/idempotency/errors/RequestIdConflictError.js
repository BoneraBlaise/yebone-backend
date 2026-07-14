class RequestIdConflictError extends Error {
  constructor(requestId, existingIdempotencyKey) {
    super(
      `Request ID "${requestId}" is already associated with idempotency key "${existingIdempotencyKey}"`
    );
    this.name = "RequestIdConflictError";
    this.requestId = requestId;
    this.existingIdempotencyKey = existingIdempotencyKey;
    this.statusCode = 409;
    this.code = "REQUEST_ID_CONFLICT";
  }
}

module.exports = RequestIdConflictError;
