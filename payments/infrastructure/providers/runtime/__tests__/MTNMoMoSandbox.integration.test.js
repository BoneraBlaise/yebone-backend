const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const RuntimeFactory = require("../RuntimeFactory");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");

const MTN_SANDBOX_ENABLED =
  process.env.MTN_MOMO_SANDBOX_INTEGRATION === "true" &&
  Boolean(process.env.MTN_MOMO_SUBSCRIPTION_KEY) &&
  Boolean(process.env.MTN_MOMO_API_USER) &&
  Boolean(process.env.MTN_MOMO_API_KEY);

const PAYPACK_SANDBOX_ENABLED =
  process.env.PAYPACK_SANDBOX_INTEGRATION === "true" &&
  Boolean(process.env.PAYPACK_CLIENT_ID) &&
  Boolean(process.env.PAYPACK_CLIENT_SECRET);

describe(
  "MTN MoMo Sandbox Integration (optional, credential-gated)",
  { skip: MTN_SANDBOX_ENABLED ? false : "MTN_MOMO_SANDBOX_INTEGRATION not enabled or credentials missing" },
  () => {
    function createRuntime() {
      return RuntimeFactory.createMtnMoMoRuntime({
        providers: [new EnvironmentCredentialProvider()],
      });
    }

    it("acquires collection OAuth token against live sandbox", async () => {
      const runtime = createRuntime();
      const token = await runtime.oauthClient.acquireToken("collection");
      assert.match(token.accessToken, /.+/);
      assert.equal(token.scope, "collection");
    });

    it("acquires disbursement OAuth token against live sandbox", async () => {
      const runtime = createRuntime();
      const token = await runtime.oauthClient.acquireToken("disbursement");
      assert.match(token.accessToken, /.+/);
      assert.equal(token.scope, "disbursement");
    });

    it("executes collection charge and verify against live sandbox", async () => {
      const runtime = createRuntime();
      const charge = await runtime.charge({
        reference: `sprint2-mtn-${Date.now()}`,
        amount: 100,
        currency: "EUR",
        metadata: { msisdn: process.env.MTN_MOMO_TEST_MSISDN || "46733123454" },
      });
      assert.equal(charge.success, true);

      const verify = await runtime.verify({
        reference: charge.metadata?.providerIdempotencyKey || charge.externalReference,
        metadata: { idempotencyKey: charge.metadata?.providerIdempotencyKey },
      });
      assert.equal(verify.success, true);
    });
  }
);

describe(
  "Paypack Sandbox Integration (optional, credential-gated)",
  { skip: PAYPACK_SANDBOX_ENABLED ? false : "PAYPACK_SANDBOX_INTEGRATION not enabled or credentials missing" },
  () => {
    function createRuntime() {
      return RuntimeFactory.createPaypackRuntime({
        providers: [new EnvironmentCredentialProvider()],
      });
    }

    it("acquires auth token against live sandbox", async () => {
      const runtime = createRuntime();
      const token = await runtime.authClient.acquireToken("default");
      assert.match(token.accessToken, /.+/);
    });

    it("executes cash-in and verify against live sandbox when configured", async () => {
      const runtime = createRuntime();
      const charge = await runtime.charge({
        reference: `sprint2-paypack-${Date.now()}`,
        amount: 100,
        currency: "RWF",
        metadata: { msisdn: process.env.PAYPACK_TEST_MSISDN || "250788123456" },
      });
      assert.equal(charge.success, true);

      if (charge.externalReference) {
        const verify = await runtime.verify({
          reference: charge.reference || `sprint2-paypack-${Date.now()}`,
          metadata: { providerReference: charge.externalReference },
        });
        assert.equal(verify.success, true);
      }
    });
  }
);
