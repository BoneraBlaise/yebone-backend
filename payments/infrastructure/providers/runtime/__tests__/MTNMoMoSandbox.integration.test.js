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
    it("acquires collection OAuth token against live sandbox", async () => {
      const runtime = RuntimeFactory.createMtnMoMoRuntime({
        providers: [new EnvironmentCredentialProvider()],
      });

      const token = await runtime.oauthClient.acquireToken("collection");
      assert.match(token.accessToken, /.+/);
      assert.equal(token.scope, "collection");
    });
  }
);

describe(
  "Paypack Sandbox Integration (optional, credential-gated)",
  { skip: PAYPACK_SANDBOX_ENABLED ? false : "PAYPACK_SANDBOX_INTEGRATION not enabled or credentials missing" },
  () => {
    it("acquires auth token against live sandbox", async () => {
      const runtime = RuntimeFactory.createPaypackRuntime({
        providers: [new EnvironmentCredentialProvider()],
      });

      const token = await runtime.authClient.acquireToken("default");
      assert.match(token.accessToken, /.+/);
    });
  }
);
