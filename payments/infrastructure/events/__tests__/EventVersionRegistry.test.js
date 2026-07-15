const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const EventVersionRegistry = require("../EventVersionRegistry");
const EventValidationError = require("../errors/EventValidationError");

describe("EventVersionRegistry", () => {
  let registry;

  beforeEach(() => {
    registry = new EventVersionRegistry();
  });

  it("registers and resolves versions", () => {
    registry.registerVersion("PAYMENT_CREATED", "1.0", { description: "v1" });
    const entry = registry.resolveVersion("PAYMENT_CREATED", "1.0");
    assert.equal(entry.version, "1.0");
    assert.equal(registry.latestVersion("PAYMENT_CREATED"), "1.0");
  });

  it("checks compatibility across versions", () => {
    registry.registerVersion("PAYMENT_CAPTURED", "1.0");
    registry.registerVersion("PAYMENT_CAPTURED", "2.0", { compatibleWith: ["1.0"] });

    assert.equal(registry.compatibility("PAYMENT_CAPTURED", "1.0", "1.0"), true);
    assert.equal(registry.compatibility("PAYMENT_CAPTURED", "1.0", "2.0"), true);
    assert.equal(registry.compatibility("PAYMENT_CAPTURED", "2.0", "1.0"), true);

    registry.registerVersion("PAYMENT_CAPTURED", "3.0");
    assert.equal(registry.compatibility("PAYMENT_CAPTURED", "1.0", "3.0"), false);
  });

  it("throws when resolving unknown version", () => {
    assert.throws(
      () => registry.resolveVersion("UNKNOWN_EVENT", "1.0"),
      EventValidationError
    );
  });

  it("registers default version matrix", () => {
    registry.registerDefaults();
    assert.equal(registry.latestVersion("PAYMENT_CAPTURED"), "2.0");
    assert.ok(registry.list().length >= 3);
  });
});
