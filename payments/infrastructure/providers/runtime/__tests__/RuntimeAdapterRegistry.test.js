const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeAdapterRegistry = require("../RuntimeAdapterRegistry");
const { createMockRuntimeAdapter } = require("./runtimeTestHelpers");

describe("RuntimeAdapterRegistry", () => {
  let registry;

  beforeEach(() => {
    registry = new RuntimeAdapterRegistry();
  });

  it("registers and retrieves runtime adapters", () => {
    const adapter = createMockRuntimeAdapter("MTN_MOMO");
    registry.register("MTN_MOMO", adapter, { enabled: true, name: "MTN Runtime" });

    assert.equal(registry.has("MTN_MOMO"), true);
    const entry = registry.get("MTN_MOMO");
    assert.equal(entry.adapter, adapter);
    assert.equal(entry.descriptor.enabled, true);
    assert.equal(entry.providerCode, "MTN_MOMO");
  });

  it("lists registered adapters as frozen entries", () => {
    registry.register("MTN_MOMO", createMockRuntimeAdapter("MTN_MOMO"));
    registry.register("PAYPACK", createMockRuntimeAdapter("PAYPACK"));

    const list = registry.list();
    assert.equal(list.length, 2);
    assert.throws(() => {
      list.push({});
    }, TypeError);
  });

  it("unregisters adapters", () => {
    registry.register("MTN_MOMO", createMockRuntimeAdapter("MTN_MOMO"));
    assert.equal(registry.unregister("MTN_MOMO"), true);
    assert.equal(registry.has("MTN_MOMO"), false);
    assert.equal(registry.get("MTN_MOMO"), null);
  });

  it("clears all adapters", () => {
    registry.register("MTN_MOMO", createMockRuntimeAdapter("MTN_MOMO"));
    registry.clear();
    assert.equal(registry.list().length, 0);
  });

  it("reports health without side effects", () => {
    registry.register("MTN_MOMO", createMockRuntimeAdapter("MTN_MOMO"), { enabled: false });
    const health = registry.health();

    assert.equal(health.ready, true);
    assert.equal(health.count, 1);
    assert.equal(health.providers[0].providerCode, "MTN_MOMO");
    assert.equal(health.providers[0].enabled, false);
  });

  it("requires runtimeAdapter on register", () => {
    assert.throws(() => registry.register("MTN_MOMO", null), /requires runtimeAdapter/);
  });

  it("overwrites duplicate registration without increasing registry size", () => {
    const firstAdapter = createMockRuntimeAdapter("MTN_MOMO");
    const secondAdapter = createMockRuntimeAdapter("MTN_MOMO");

    registry.register("MTN_MOMO", firstAdapter, { enabled: false, name: "First" });
    registry.register("MTN_MOMO", secondAdapter, { enabled: true, name: "Second" });

    assert.equal(registry.list().length, 1);
    assert.equal(registry.has("MTN_MOMO"), true);
    assert.equal(registry.get("MTN_MOMO").adapter, secondAdapter);
    assert.equal(registry.get("MTN_MOMO").descriptor.name, "Second");
    assert.equal(registry.get("MTN_MOMO").descriptor.enabled, true);

    const health = registry.health();
    assert.equal(health.count, 1);
    assert.equal(health.providers.length, 1);
    assert.equal(health.providers[0].providerCode, "MTN_MOMO");
    assert.equal(health.providers[0].enabled, true);
    assert.equal(health.providers[0].hasAdapter, true);
  });

  it("isolates registrations across separate registry instances", () => {
    const registryA = new RuntimeAdapterRegistry();
    const registryB = new RuntimeAdapterRegistry();

    registryA.register("MTN_MOMO", createMockRuntimeAdapter("MTN_MOMO"));

    assert.equal(registryA.has("MTN_MOMO"), true);
    assert.equal(registryA.list().length, 1);
    assert.equal(registryB.has("MTN_MOMO"), false);
    assert.equal(registryB.list().length, 0);
    assert.equal(registryB.health().count, 0);
  });
});
