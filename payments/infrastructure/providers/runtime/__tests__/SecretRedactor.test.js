const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const SecretRedactor = require("../security/SecretRedactor");

describe("SecretRedactor", () => {
  it("redacts credential objects", () => {
    const redacted = SecretRedactor.redactCredentials({
      apiKey: "secret-key",
      apiUser: "user",
      collection: { subscriptionKey: "sub-key" },
    });

    assert.equal(redacted.apiKey, "[REDACTED]");
    assert.equal(redacted.apiUser, "[REDACTED]");
    assert.equal(redacted.collection.subscriptionKey, "[REDACTED]");
  });

  it("redacts sensitive environment keys", () => {
    const redacted = SecretRedactor.redactEnvironment({
      NODE_ENV: "test",
      MTN_MOMO_API_KEY: "secret",
      PAYPACK_CLIENT_SECRET: "secret",
    });

    assert.equal(redacted.NODE_ENV, "test");
    assert.equal(redacted.MTN_MOMO_API_KEY, "[REDACTED]");
    assert.equal(redacted.PAYPACK_CLIENT_SECRET, "[REDACTED]");
  });

  it("redacts error payloads and diagnostics", () => {
    const error = SecretRedactor.redactErrorPayload({
      message: "failed",
      details: {
        headers: { Authorization: "Bearer token" },
        credentials: { apiKey: "secret" },
      },
    });

    assert.equal(error.details.headers.Authorization, "[REDACTED]");
    assert.equal(error.details.credentials.apiKey, "[REDACTED]");

    const diagnostics = SecretRedactor.redactDiagnostics({
      correlationId: "corr-1",
      metadata: { client_secret: "secret" },
    });
    assert.equal(diagnostics.metadata.client_secret, "[REDACTED]");
  });
});
