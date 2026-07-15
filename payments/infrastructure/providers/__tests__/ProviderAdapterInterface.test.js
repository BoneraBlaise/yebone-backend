const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ProviderAdapterInterface = require("../ProviderAdapterInterface");
const { createProviderFoundation } = require("./testHelpers");
const { ProviderOperation } = require("../ProviderOperation");

describe("ProviderAdapterInterface", () => {
  it("defines the required adapter contract", () => {
    const contract = ProviderAdapterInterface.createContract();
    assert.deepEqual(contract.methods, [
      ProviderOperation.CHARGE,
      ProviderOperation.VERIFY,
      ProviderOperation.REFUND,
      ProviderOperation.PAYOUT,
      ProviderOperation.WEBHOOK,
      "health",
    ]);
  });

  it("asserts skeleton adapters implement all methods", () => {
    const foundation = createProviderFoundation();
    const adapter = foundation.adapterRegistry.getAdapter("MTN_MOMO");
    assert.equal(ProviderAdapterInterface.assertImplementation(adapter, "MTN_MOMO"), true);
  });

  it("rejects incomplete adapter implementations", () => {
    assert.throws(
      () => ProviderAdapterInterface.assertImplementation({ charge() {} }, "BAD"),
      /must implement verify/
    );
  });
});
