const crypto = require("crypto");
const PaymentEngineConfig = require("./PaymentEngineConfig");

/**
 * Normalizes payment operation input and trace context for engine orchestration.
 */
class PaymentEngineContext {
  static fromRequest(input = {}, trace = {}) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("amount must be a non-negative number");
    }

    const orderId = PaymentEngineContext._requiredString(input.orderId, "orderId");
    const buyerId = PaymentEngineContext._requiredString(input.buyerId, "buyerId");
    const sellerId = PaymentEngineContext._optionalString(input.sellerId);
    const currency = PaymentEngineContext._optionalString(input.currency)?.toUpperCase()
      || PaymentEngineConfig.defaultCurrency;

    const correlationId =
      trace.correlationId || input.correlationId || crypto.randomUUID();
    const requestId = trace.requestId || input.requestId || crypto.randomUUID();
    const traceId = trace.traceId || input.traceId || correlationId;
    const idempotencyKey =
      trace.idempotencyKey || input.idempotencyKey || `charge:${orderId}:${buyerId}`;

    return Object.freeze({
      orderId,
      buyerId,
      sellerId,
      amount,
      currency,
      paymentMethod: PaymentEngineContext._optionalString(input.paymentMethod)?.toUpperCase() || null,
      providerCode: PaymentEngineContext._optionalString(input.providerCode)?.toUpperCase() || null,
      countryCode: PaymentEngineContext._optionalString(input.countryCode)?.toUpperCase() || "RW",
      paymentReference: PaymentEngineContext._optionalString(input.paymentReference),
      metadata: input.metadata || {},
      trace: Object.freeze({
        correlationId: String(correlationId).trim(),
        requestId: String(requestId).trim(),
        traceId: String(traceId).trim(),
        idempotencyKey: String(idempotencyKey).trim(),
      }),
    });
  }

  static toIdempotencyContext(context) {
    return {
      correlationId: context.trace.correlationId,
      requestId: context.trace.requestId,
      paymentReference: context.paymentReference,
      metadata: {
        traceId: context.trace.traceId,
        orderId: context.orderId,
      },
    };
  }

  static toTransactionInput(context) {
    return {
      orderId: context.orderId,
      buyerId: context.buyerId,
      sellerId: context.sellerId,
      amount: context.amount,
      currency: context.currency,
      paymentReference: context.paymentReference || context.reference,
      providerCode: context.providerCode,
      metadata: {
        ...context.metadata,
        correlationId: context.trace.correlationId,
        requestId: context.trace.requestId,
        traceId: context.trace.traceId,
        idempotencyKey: context.trace.idempotencyKey,
        paymentMethod: context.paymentMethod,
        countryCode: context.countryCode,
      },
    };
  }

  static fromVerifyRequest(input = {}, trace = {}) {
    const reference = PaymentEngineContext._requiredString(
      input.reference || input.paymentReference,
      "reference"
    );
    const correlationId =
      trace.correlationId || input.correlationId || crypto.randomUUID();
    const requestId = trace.requestId || input.requestId || crypto.randomUUID();
    const traceId = trace.traceId || input.traceId || correlationId;
    const idempotencyKey =
      trace.idempotencyKey || input.idempotencyKey || `verify:${reference}`;

    return Object.freeze({
      reference,
      paymentMethod: PaymentEngineContext._optionalString(input.paymentMethod)?.toUpperCase() || null,
      providerCode: PaymentEngineContext._optionalString(input.providerCode)?.toUpperCase() || null,
      countryCode: PaymentEngineContext._optionalString(input.countryCode)?.toUpperCase() || "RW",
      currency: PaymentEngineContext._optionalString(input.currency)?.toUpperCase()
        || PaymentEngineConfig.defaultCurrency,
      metadata: input.metadata || {},
      trace: Object.freeze({
        correlationId: String(correlationId).trim(),
        requestId: String(requestId).trim(),
        traceId: String(traceId).trim(),
        idempotencyKey: String(idempotencyKey).trim(),
      }),
    });
  }

  static fromPayoutRequest(input = {}, trace = {}) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("amount must be a non-negative number");
    }

    const orderId = PaymentEngineContext._requiredString(input.orderId, "orderId");
    const buyerId = PaymentEngineContext._requiredString(input.buyerId, "buyerId");
    const sellerId = PaymentEngineContext._optionalString(input.sellerId);
    const currency = PaymentEngineContext._optionalString(input.currency)?.toUpperCase()
      || PaymentEngineConfig.defaultCurrency;

    const correlationId =
      trace.correlationId || input.correlationId || crypto.randomUUID();
    const requestId = trace.requestId || input.requestId || crypto.randomUUID();
    const traceId = trace.traceId || input.traceId || correlationId;
    const idempotencyKey =
      trace.idempotencyKey || input.idempotencyKey || `payout:${orderId}:${buyerId}`;

    return Object.freeze({
      orderId,
      buyerId,
      sellerId,
      amount,
      currency,
      paymentMethod: PaymentEngineContext._optionalString(input.paymentMethod)?.toUpperCase() || null,
      providerCode: PaymentEngineContext._optionalString(input.providerCode)?.toUpperCase() || null,
      countryCode: PaymentEngineContext._optionalString(input.countryCode)?.toUpperCase() || "RW",
      paymentReference: PaymentEngineContext._optionalString(input.paymentReference),
      metadata: input.metadata || {},
      trace: Object.freeze({
        correlationId: String(correlationId).trim(),
        requestId: String(requestId).trim(),
        traceId: String(traceId).trim(),
        idempotencyKey: String(idempotencyKey).trim(),
      }),
    });
  }

  static fromRefundRequest(input = {}, trace = {}) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("amount must be a non-negative number");
    }

    const orderId = PaymentEngineContext._requiredString(input.orderId, "orderId");
    const reference = PaymentEngineContext._requiredString(
      input.reference || input.paymentReference,
      "reference"
    );
    const currency = PaymentEngineContext._optionalString(input.currency)?.toUpperCase()
      || PaymentEngineConfig.defaultCurrency;

    const correlationId =
      trace.correlationId || input.correlationId || crypto.randomUUID();
    const requestId = trace.requestId || input.requestId || crypto.randomUUID();
    const traceId = trace.traceId || input.traceId || correlationId;
    const idempotencyKey =
      trace.idempotencyKey || input.idempotencyKey || `refund:${orderId}:${reference}`;

    return Object.freeze({
      orderId,
      reference,
      amount,
      currency,
      paymentMethod: PaymentEngineContext._optionalString(input.paymentMethod)?.toUpperCase() || null,
      providerCode: PaymentEngineContext._optionalString(input.providerCode)?.toUpperCase() || null,
      countryCode: PaymentEngineContext._optionalString(input.countryCode)?.toUpperCase() || "RW",
      metadata: input.metadata || {},
      trace: Object.freeze({
        correlationId: String(correlationId).trim(),
        requestId: String(requestId).trim(),
        traceId: String(traceId).trim(),
        idempotencyKey: String(idempotencyKey).trim(),
      }),
    });
  }

  static _requiredString(value, fieldName) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      throw new Error(`${fieldName} is required`);
    }
    return normalized;
  }

  static _optionalString(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    return String(value).trim();
  }
}

module.exports = PaymentEngineContext;
