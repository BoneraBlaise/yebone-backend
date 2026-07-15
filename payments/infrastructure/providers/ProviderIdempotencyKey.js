/**
 * Immutable provider-scoped idempotency key model.
 * Architecture-only — not sent to external APIs at Module 9.
 */
class ProviderIdempotencyKey {
  static create({
    key,
    providerCode,
    operation = null,
    reference = null,
    platformIdempotencyKey = null,
    source = "foundation",
  } = {}) {
    if (!key) {
      throw new Error("ProviderIdempotencyKey requires key");
    }
    if (!providerCode) {
      throw new Error("ProviderIdempotencyKey requires providerCode");
    }

    return Object.freeze({
      key: String(key),
      providerCode: String(providerCode).trim().toUpperCase(),
      operation: operation ? String(operation).trim().toLowerCase() : null,
      reference: reference ? String(reference) : null,
      platformIdempotencyKey: platformIdempotencyKey ? String(platformIdempotencyKey) : null,
      source: String(source),
      mock: true,
      transmitted: false,
    });
  }

  static toMetadata(idempotencyKey) {
    if (!idempotencyKey) {
      return Object.freeze({});
    }

    return Object.freeze({
      providerIdempotencyKey: idempotencyKey.key,
      providerIdempotencyProviderCode: idempotencyKey.providerCode,
      providerIdempotencyOperation: idempotencyKey.operation,
      providerIdempotencyReference: idempotencyKey.reference,
      providerIdempotencyPlatformKey: idempotencyKey.platformIdempotencyKey,
      providerIdempotencyMock: Boolean(idempotencyKey.mock),
      providerIdempotencyTransmitted: Boolean(idempotencyKey.transmitted),
    });
  }
}

module.exports = ProviderIdempotencyKey;
