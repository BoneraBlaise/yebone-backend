const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const MTNMoMoRuntimeAdapter = require("../mtn/MTNMoMoRuntimeAdapter");
const PaypackRuntimeAdapter = require("../paypack/PaypackRuntimeAdapter");
const ProviderReferenceInterface = require("../../ProviderReferenceInterface");
const ProviderReferenceContract = require("../../ProviderReferenceContract");
const ProviderIdempotencyContract = require("../../ProviderIdempotencyContract");
const WebhookVerificationInterface = require("../../WebhookVerificationInterface");
const { createRoutingTransport, mtnMoMoSandboxRoutes } = require("./mockHttp");

describe("Runtime adapter contract parity", () => {
  const env = {
    MTN_MOMO_SUBSCRIPTION_KEY: "sub-key",
    MTN_MOMO_API_USER: "api-user",
    MTN_MOMO_API_KEY: "api-key",
    PAYPACK_CLIENT_ID: "client-id",
    PAYPACK_CLIENT_SECRET: "client-secret",
  };

  function createMtnRuntime() {
    return RuntimeFactory.createMtnMoMoRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport: createRoutingTransport(mtnMoMoSandboxRoutes()),
    });
  }

  function createPaypackRuntime() {
    return RuntimeFactory.createPaypackRuntime({
      providers: [new EnvironmentCredentialProvider({ env })],
      transport: createRoutingTransport([
        {
          match: ({ url }) => url.includes("/auth/agents/authorize"),
          respond: () => ({
            status: 200,
            body: { access: "paypack-token", expires_in: 3600 },
          }),
        },
      ]),
    });
  }

  for (const [label, createRuntime, assertContract, code] of [
    ["MTN_MOMO", createMtnRuntime, MTNMoMoRuntimeAdapter.assertContract, "MTN_MOMO"],
    ["PAYPACK", createPaypackRuntime, PaypackRuntimeAdapter.assertContract, "PAYPACK"],
  ]) {
    it(`${label} satisfies ProviderAdapterInterface`, () => {
      const runtime = createRuntime();
      assert.doesNotThrow(() => assertContract(runtime));
    });

    it(`${label} exposes ProviderReferenceInterface`, () => {
      const runtime = createRuntime();
      assert.equal(ProviderReferenceInterface.assertImplementation(runtime, code), true);
      assert.ok(runtime.providerReference instanceof ProviderReferenceContract);
    });

    it(`${label} exposes idempotency contract helpers`, () => {
      const runtime = createRuntime();
      assert.ok(runtime.providerIdempotency instanceof ProviderIdempotencyContract);
      assert.equal(runtime.supportsProviderIdempotency(), true);

      const key = runtime.buildProviderIdempotencyKey({
        operation: "charge",
        reference: "order-1",
      });
      assert.equal(runtime.validateProviderIdempotencyKey(key).valid, true);
      assert.ok(runtime.buildProviderIdempotencyMetadata({ operation: "charge", reference: "order-1" }).providerIdempotencyKey);
    });

    it(`${label} exposes reference contract helpers`, () => {
      const runtime = createRuntime();
      const reference = runtime.buildProviderReference({ reference: "order-1" });
      assert.equal(runtime.validateProviderReference(reference).valid, true);
      assert.ok(runtime.buildProviderReferenceMetadata({ reference: "order-1" }).providerReferenceMerchant);
    });

    it(`${label} exposes WebhookVerificationInterface`, () => {
      const runtime = createRuntime();
      assert.equal(WebhookVerificationInterface.assertImplementation(runtime, code), true);
      assert.equal(typeof runtime.verifyWebhook, "function");
      assert.equal(typeof runtime.verifySignature, "function");
    });
  }
});
