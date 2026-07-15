const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const EngineDependencyContainer = require("../EngineDependencyContainer");

describe("EngineDependencyContainer", () => {
  it("registers and retrieves services", () => {
    const container = new EngineDependencyContainer();
    const mock = { name: "idempotency" };
    container.register("idempotencyService", mock);
    assert.equal(container.get("idempotencyService"), mock);
    assert.equal(container.has("idempotencyService"), true);
  });

  it("throws when service is missing", () => {
    const container = new EngineDependencyContainer();
    assert.throws(() => container.get("missing"), /Service not registered/);
  });

  it("lists registered service names", () => {
    const container = new EngineDependencyContainer({ auditService: {}, engine: {} });
    const names = container.list().sort();
    assert.deepEqual(names, ["auditService", "engine"]);
  });

  it("returns immutable snapshot of services", () => {
    const auditService = { record: async () => {} };
    const container = new EngineDependencyContainer({ auditService });
    const snapshot = container.snapshot();
    assert.equal(snapshot.auditService, auditService);
  });
});
