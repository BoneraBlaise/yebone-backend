const crypto = require("crypto");
const OrderIdempotencyRecord = require("./models/OrderIdempotencyRecord");

/**
 * Persistent idempotency storage for order creation.
 */
class OrderIdempotencyService {
  constructor({ scope = "order_create" } = {}) {
    this.scope = scope;
  }

  hashRequest(payload = {}) {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex");
  }

  _error(message, statusCode = 409) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  async execute(key, requestPayload, handler) {
    if (!key) {
      return handler();
    }

    const requestHash = this.hashRequest(requestPayload);
    const existing = await OrderIdempotencyRecord.findOne({ key, scope: this.scope });

    if (existing?.status === "completed") {
      if (existing.requestHash && existing.requestHash !== requestHash) {
        throw this._error(
          "Idempotency-Key reused with a different request payload",
          422
        );
      }
      return { ...existing.response, fromCache: true };
    }

    if (existing?.status === "processing") {
      throw this._error("Duplicate order request is already being processed", 409);
    }

    let record;
    try {
      record = await OrderIdempotencyRecord.create({
        key,
        scope: this.scope,
        status: "processing",
        requestHash,
      });
    } catch (error) {
      if (error.code === 11000) {
        throw this._error("Duplicate order request is already being processed", 409);
      }
      throw error;
    }

    try {
      const result = await handler();
      record.status = "completed";
      record.response = result;
      await record.save();
      return { ...result, fromCache: false };
    } catch (error) {
      await OrderIdempotencyRecord.deleteOne({ _id: record._id });
      throw error;
    }
  }
}

module.exports = OrderIdempotencyService;
