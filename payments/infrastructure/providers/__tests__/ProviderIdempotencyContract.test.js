const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const ProviderIdempotencyContract = require("../ProviderIdempotencyContract");
const ProviderIdempotencyKey = require("../ProviderIdempotencyKey");
const { createProviderFoundation, enableMtn } = require("./testHelpers");

describe("ProviderIdempotencyContract", () => {
  let contract;

  beforeEach(() => {
    contract = new ProviderIdempotencyContract("MTN_MOMO");
  });

  it("documents future Module 10 provider idempotency behavior", () => {
    const future = ProviderIdempotencyContract.describeFutureBehavior();
    assert.equal(future.module, 10);
    assert.equal(future.transmittedToProvider, false);
    assert.equal(future.httpRequired, false);
  });

  it("supports provider idempotency for all default skeleton providers", () => {
    for (const code of ["MTN_MOMO", "AIRTEL_MONEY", "PAYPACK", "FLUTTERWAVE", "STRIPE"]) {
      const providerContract = new ProviderIdempotencyContract(code);
      assert.equal(providerContract.supportsProviderIdempotency(), true);
    }
  });

  it("buildKey returns deterministic immutable ProviderIdempotencyKey", () => {
    const input = {
      operation: "charge",
      reference: "order-100",
      trace: { idempotencyKey: "platform-key-1" },
    };

    const first = contract.buildKey(input);
    const second = contract.buildKey(input);

    assert.equal(first.key, second.key);
    assert.match(first.key, /^pidem_mtnmomo_[a-f0-9]{24}$/);
    assert.equal(first.providerCode, "MTN_MOMO");
    assert.equal(first.operation, "charge");
    assert.equal(first.reference, "order-100");
    assert.equal(first.platformIdempotencyKey, "platform-key-1");
    assert.equal(first.transmitted, false);
    assert.equal(Object.isFrozen(first), true);
  });

  it("validateKey accepts keys built for the same provider", () => {
    const built = contract.buildKey({ operation: "charge", reference: "ref-1" });
    const validation = contract.validateKey(built);
    assert.equal(validation.valid, true);
    assert.equal(validation.transmitted, false);
  });

  it("validateKey rejects missing or malformed keys", () => {
    assert.equal(contract.validateKey(null).reason, "KEY_MISSING");
    assert.equal(contract.validateKey("short").reason, "KEY_LENGTH_INVALID");
    assert.equal(contract.validateKey("bad_prefix_mtnmomo_abc").reason, "KEY_PREFIX_INVALID");
  });

  it("validateKey rejects provider mismatch", () => {
    const stripeContract = new ProviderIdempotencyContract("STRIPE");
    const mtnKey = contract.buildKey({ operation: "charge", reference: "x" });
    const validation = stripeContract.validateKey(mtnKey.key);
    assert.equal(validation.valid, false);
    assert.equal(validation.reason, "PROVIDER_MISMATCH");
  });

  it("buildOptionalMetadata exposes key as optional integration metadata", () => {
    const metadata = contract.buildOptionalMetadata({
      operation: "refund",
      reference: "ref-2",
    });

    assert.ok(metadata.providerIdempotencyKey);
    assert.equal(metadata.providerIdempotencyProviderCode, "MTN_MOMO");
    assert.equal(metadata.providerIdempotencyMock, true);
    assert.equal(metadata.providerIdempotencyTransmitted, false);
    assert.equal(Object.isFrozen(metadata), true);
  });

  it("ProviderIdempotencyKey.toMetadata returns empty object for null input", () => {
    assert.deepEqual(ProviderIdempotencyKey.toMetadata(null), {});
  });
});

describe("BaseProviderAdapter idempotency exposure", () => {
  it("exposes contract methods without altering default charge responses", async () => {
    const foundation = createProviderFoundation();
    enableMtn(foundation);
    const adapter = foundation.adapterRegistry.getAdapter("MTN_MOMO");

    assert.equal(adapter.supportsProviderIdempotency(), true);
    assert.ok(adapter.providerIdempotency instanceof ProviderIdempotencyContract);

    const response = await adapter.charge({
      country: "RW",
      currency: "RWF",
      paymentMethod: "MOBILE_MONEY",
      amount: 500,
      reference: "order-idem",
    });

    assert.equal(response.success, true);
    assert.equal(response.metadata.providerIdempotencyKey, undefined);

    const metadata = adapter.buildProviderIdempotencyMetadata({
      operation: "charge",
      reference: "order-idem",
    });
    assert.ok(metadata.providerIdempotencyKey);
  });
});
