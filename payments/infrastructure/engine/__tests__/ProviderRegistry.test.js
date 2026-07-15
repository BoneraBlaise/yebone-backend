const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const ProviderRegistry = require("../ProviderRegistry");
const ProviderNotRegisteredError = require("../errors/ProviderNotRegisteredError");

describe("ProviderRegistry", () => {
  let registry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it("registers and resolves provider descriptors with capabilities", () => {
    registry.register({
      code: "MTN_MOMO",
      supportedCountries: ["RW"],
      supportedMethods: ["MOBILE_MONEY"],
      supportedCurrencies: ["RWF"],
      capabilities: ["payments", "refunds"],
    });

    const entry = registry.resolve("MTN_MOMO");
    assert.equal(entry.code, "MTN_MOMO");
    assert.equal(entry.enabled, false);
    assert.equal(entry.supports("payments"), true);
    assert.equal(entry.supports("wallet"), false);
  });

  it("throws when resolving unknown provider", () => {
    assert.throws(() => registry.resolve("UNKNOWN"), ProviderNotRegisteredError);
  });

  it("enables and disables providers", () => {
    registry.register({ code: "STRIPE", supportedCountries: ["US"], supportedMethods: ["CARD"] });
    registry.enable("STRIPE");
    assert.equal(registry.resolve("STRIPE").enabled, true);
    registry.disable("STRIPE");
    assert.equal(registry.resolve("STRIPE").enabled, false);
  });

  it("lists all or enabled-only providers", () => {
    registry.register({ code: "PAYPACK", enabled: true, supportedCountries: ["RW"], supportedMethods: ["CARD"] });
    registry.register({ code: "STRIPE", enabled: false, supportedCountries: ["US"], supportedMethods: ["CARD"] });
    assert.equal(registry.list().length, 2);
    assert.equal(registry.list({ enabledOnly: true }).length, 1);
  });

  it("finds providers by country and payment method", () => {
    registry.registerDefaults();
    const rwMobile = registry.findByCountry("RW", { enabledOnly: false }).filter((entry) =>
      entry.supportedMethods.includes("MOBILE_MONEY")
    );
    assert.ok(rwMobile.some((entry) => entry.code === "MTN_MOMO"));
    assert.ok(registry.findByPaymentMethod("CARD").some((entry) => entry.code === "STRIPE"));
  });

  it("registers all default provider descriptors", () => {
    registry.registerDefaults();
    const codes = registry.list().map((entry) => entry.code);
    assert.deepEqual(codes.sort(), [
      "AIRTEL_MONEY",
      "FLUTTERWAVE",
      "MTN_MOMO",
      "PAYPACK",
      "STRIPE",
    ]);
  });
});
