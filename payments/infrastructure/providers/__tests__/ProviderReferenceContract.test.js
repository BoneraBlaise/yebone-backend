const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const ProviderReference = require("../ProviderReference");
const ProviderReferenceContract = require("../ProviderReferenceContract");
const ProviderReferenceInterface = require("../ProviderReferenceInterface");
const { createProviderFoundation, enableMtn } = require("./testHelpers");

describe("ProviderReferenceContract", () => {
  let contract;

  beforeEach(() => {
    contract = new ProviderReferenceContract("FLUTTERWAVE");
  });

  it("documents future Module 10 reference behavior", () => {
    const future = ProviderReferenceContract.describeFutureBehavior();
    assert.equal(future.module, 10);
    assert.equal(future.transmittedToProvider, false);
    assert.equal(future.httpRequired, false);
  });

  it("buildReference returns immutable normalized references", () => {
    const reference = contract.buildReference({
      reference: "order-200",
      merchantReference: "merchant-200",
      customerReference: "buyer-9",
      settlementReference: "settle-1",
      reconciliationReference: "recon-1",
    });

    assert.equal(reference.providerCode, "FLUTTERWAVE");
    assert.equal(reference.merchantReference, "merchant-200");
    assert.equal(reference.customerReference, "buyer-9");
    assert.equal(reference.settlementReference, "settle-1");
    assert.equal(reference.reconciliationReference, "recon-1");
    assert.ok(reference.providerReference);
    assert.equal(reference.mock, true);
    assert.equal(reference.transmitted, false);
    assert.equal(Object.isFrozen(reference), true);
  });

  it("validateReference accepts references for the same provider", () => {
    const reference = contract.buildReference({ reference: "order-201" });
    const validation = contract.validateReference(reference);
    assert.equal(validation.valid, true);
  });

  it("validateReference rejects provider mismatch and empty references", () => {
    const stripeContract = new ProviderReferenceContract("STRIPE");
    const reference = contract.buildReference({ reference: "order-202" });

    assert.equal(stripeContract.validateReference(reference).reason, "PROVIDER_MISMATCH");
    assert.equal(
      contract.validateReference({ providerCode: "FLUTTERWAVE" }).reason,
      "REFERENCE_FIELDS_EMPTY"
    );
  });

  it("ProviderReference.toJSON is serializable", () => {
    const reference = contract.buildReference({ reference: "order-203" });
    const json = ProviderReference.toJSON(reference);
    const serialized = JSON.parse(JSON.stringify(json));

    assert.equal(serialized.providerCode, "FLUTTERWAVE");
    assert.equal(serialized.mock, true);
    assert.equal(serialized.transmitted, false);
    assert.equal(Object.isFrozen(json), true);
  });

  it("buildOptionalMetadata exposes references as optional integration metadata", () => {
    const metadata = contract.buildOptionalMetadata({
      reference: "order-204",
      reconciliationReference: "recon-204",
    });

    assert.equal(metadata.providerReferenceCode, "FLUTTERWAVE");
    assert.ok(metadata.providerReferenceProvider);
    assert.equal(metadata.providerReferenceReconciliation, "recon-204");
    assert.equal(metadata.providerReferenceMock, true);
    assert.equal(metadata.providerReferenceTransmitted, false);
  });
});

describe("ProviderReferenceInterface and adapter exposure", () => {
  it("asserts all skeleton adapters expose the reference contract", () => {
    const foundation = createProviderFoundation();
    for (const code of ["MTN_MOMO", "AIRTEL_MONEY", "PAYPACK", "FLUTTERWAVE", "STRIPE"]) {
      const adapter = foundation.adapterRegistry.getAdapter(code);
      assert.equal(ProviderReferenceInterface.assertImplementation(adapter, code), true);
      assert.ok(adapter.providerReference instanceof ProviderReferenceContract);
    }
  });

  it("does not alter default charge mock responses", async () => {
    const foundation = createProviderFoundation();
    enableMtn(foundation);
    const adapter = foundation.adapterRegistry.getAdapter("MTN_MOMO");

    const response = await adapter.charge({
      country: "RW",
      currency: "RWF",
      paymentMethod: "MOBILE_MONEY",
      amount: 900,
      reference: "order-ref",
    });

    assert.equal(response.success, true);
    assert.equal(response.metadata.providerReferenceProvider, undefined);

    const metadata = adapter.buildProviderReferenceMetadata({ reference: "order-ref" });
    assert.ok(metadata.providerReferenceMerchant);
  });
});
