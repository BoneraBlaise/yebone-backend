const { createHash } = require("node:crypto");
const ProviderRequest = require("./models/ProviderRequest");
const ProviderIdempotencyKey = require("./ProviderIdempotencyKey");

const KEY_PREFIX = "pidem";
const MIN_KEY_LENGTH = 16;
const MAX_KEY_LENGTH = 128;

/**
 * Provider-native idempotency architecture — design only at Module 9.
 * Does not transmit keys to provider APIs or alter adapter execution.
 */
const PROVIDER_IDEMPOTENCY_SUPPORT = Object.freeze({
  MTN_MOMO: true,
  AIRTEL_MONEY: true,
  PAYPACK: true,
  FLUTTERWAVE: true,
  STRIPE: true,
});

class ProviderIdempotencyContract {
  constructor(providerCode) {
    this.providerCode = String(providerCode || "").trim().toUpperCase();
  }

  static describeFutureBehavior() {
    return Object.freeze({
      module: 10,
      transmittedToProvider: false,
      buildKey: "Derive deterministic provider-scoped idempotency key for outbound API calls",
      validateKey: "Validate key shape and provider ownership before transmission",
      supportsProviderIdempotency:
        "Indicate whether provider accepts native idempotency keys (e.g. Stripe Idempotency-Key header)",
      platformIntegration:
        "Optional metadata attachment — does not replace Module 1 platform idempotency layer",
      httpRequired: false,
    });
  }

  supportsProviderIdempotency(providerCode = this.providerCode) {
    const code = String(providerCode || this.providerCode).trim().toUpperCase();
    return Boolean(PROVIDER_IDEMPOTENCY_SUPPORT[code]);
  }

  buildKey(input = {}) {
    const request = ProviderRequest.normalize({
      ...input,
      providerCode: input.providerCode || this.providerCode,
    });

    const digest = ProviderIdempotencyContract._digest({
      providerCode: request.providerCode,
      operation: request.operation,
      reference: request.reference,
      platformIdempotencyKey:
        request.trace?.idempotencyKey || request.metadata?.platformIdempotencyKey || null,
      amount: request.amount,
      currency: request.currency,
    });

    const normalizedProvider = request.providerCode.toLowerCase().replace(/_/g, "");
    const key = `${KEY_PREFIX}_${normalizedProvider}_${digest}`;

    return ProviderIdempotencyKey.create({
      key,
      providerCode: request.providerCode,
      operation: request.operation,
      reference: request.reference,
      platformIdempotencyKey:
        request.trace?.idempotencyKey || request.metadata?.platformIdempotencyKey || null,
      source: "ProviderIdempotencyContract.buildKey",
    });
  }

  validateKey(keyInput) {
    const key =
      typeof keyInput === "string"
        ? keyInput
        : keyInput?.key;

    if (!key || typeof key !== "string") {
      return Object.freeze({ valid: false, reason: "KEY_MISSING" });
    }

    const trimmed = key.trim();
    if (trimmed.length < MIN_KEY_LENGTH || trimmed.length > MAX_KEY_LENGTH) {
      return Object.freeze({ valid: false, reason: "KEY_LENGTH_INVALID" });
    }

    if (!trimmed.startsWith(`${KEY_PREFIX}_`)) {
      return Object.freeze({ valid: false, reason: "KEY_PREFIX_INVALID" });
    }

    const normalizedProvider = this.providerCode.toLowerCase().replace(/_/g, "");
    const expectedPrefix = `${KEY_PREFIX}_${normalizedProvider}_`;
    if (!trimmed.startsWith(expectedPrefix)) {
      return Object.freeze({
        valid: false,
        reason: "PROVIDER_MISMATCH",
        expectedProvider: this.providerCode,
      });
    }

    return Object.freeze({
      valid: true,
      providerCode: this.providerCode,
      mock: true,
      transmitted: false,
    });
  }

  buildOptionalMetadata(input = {}) {
    if (!this.supportsProviderIdempotency()) {
      return Object.freeze({});
    }

    const idempotencyKey = this.buildKey(input);
    return ProviderIdempotencyKey.toMetadata(idempotencyKey);
  }

  static _digest(parts) {
    const payload = JSON.stringify(parts);
    return createHash("sha256").update(payload).digest("hex").slice(0, 24);
  }
}

module.exports = ProviderIdempotencyContract;
