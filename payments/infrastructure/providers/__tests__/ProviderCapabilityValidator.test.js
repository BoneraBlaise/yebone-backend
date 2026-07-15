const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const ProviderCapabilityValidator = require("../ProviderCapabilityValidator");
const ProviderCapabilityError = require("../errors/ProviderCapabilityError");
const { ProviderCapability } = require("../../engine/ProviderCapabilities");
const ProviderRegistry = require("../../engine/ProviderRegistry");

describe("ProviderCapabilityValidator", () => {
  let validator;
  let registry;

  beforeEach(() => {
    validator = new ProviderCapabilityValidator();
    registry = new ProviderRegistry();
    registry.registerDefaults();
  });

  it("validates payments capability for charge", () => {
    const descriptor = registry.resolve("MTN_MOMO");
    assert.equal(validator.validate(descriptor, "charge"), ProviderCapability.PAYMENTS);
  });

  it("validates refunds capability for refund", () => {
    const descriptor = registry.resolve("STRIPE");
    assert.equal(validator.validate(descriptor, "refund"), ProviderCapability.REFUNDS);
  });

  it("validates payouts capability for payout", () => {
    const descriptor = registry.resolve("FLUTTERWAVE");
    assert.equal(validator.validate(descriptor, "payout"), ProviderCapability.PAYOUTS);
  });

  it("validates webhooks capability for webhook", () => {
    const descriptor = registry.resolve("AIRTEL_MONEY");
    assert.equal(validator.validate(descriptor, "webhook"), ProviderCapability.WEBHOOKS);
  });

  it("lists supported capabilities including subscriptions for Stripe", () => {
    const descriptor = registry.resolve("STRIPE");
    const supported = validator.listSupported(descriptor);
    assert.ok(supported.includes(ProviderCapability.SUBSCRIPTIONS));
    assert.ok(supported.includes(ProviderCapability.PAYMENTS));
  });

  it("throws when operation capability is unsupported", () => {
    const descriptor = registry.register({
      code: "LIMITED",
      capabilities: [ProviderCapability.PAYMENTS],
      supportedCountries: ["RW"],
      supportedCurrencies: ["RWF"],
      supportedMethods: ["CARD"],
    });

    assert.throws(
      () => validator.validate(descriptor, "payout"),
      ProviderCapabilityError
    );
  });
});
