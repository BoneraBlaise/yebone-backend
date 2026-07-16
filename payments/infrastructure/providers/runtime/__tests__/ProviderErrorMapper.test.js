const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ProviderErrorMapper = require("../ProviderErrorMapper");
const ProviderHttpError = require("../errors/ProviderHttpError");
const ProviderAuthError = require("../errors/ProviderAuthError");
const ProviderTimeoutError = require("../errors/ProviderTimeoutError");
const ProviderError = require("../../models/ProviderError");

describe("ProviderErrorMapper", () => {
  const mapper = new ProviderErrorMapper();

  it("maps ProviderHttpError", () => {
    const error = new ProviderHttpError("HTTP failed", {
      statusCode: 502,
      providerCode: "MTN_MOMO",
    });
    const mapped = mapper.map(error, { operation: "oauth" });
    assert.ok(mapped instanceof ProviderError);
    assert.equal(mapped.code, "PROVIDER_HTTP_502");
    assert.equal(mapped.details.statusCode, 502);
  });

  it("maps ProviderAuthError", () => {
    const mapped = mapper.map(new ProviderAuthError("Auth failed", { providerCode: "PAYPACK" }), {
      operation: "oauth",
    });
    assert.equal(mapped.code, "PROVIDER_AUTH_ERROR");
  });

  it("maps ProviderTimeoutError", () => {
    const mapped = mapper.map(new ProviderTimeoutError("Timed out", { timeoutMs: 1000 }), {
      providerCode: "MTN_MOMO",
    });
    assert.equal(mapped.code, "PROVIDER_TIMEOUT");
  });

  it("maps HTTP status bodies", () => {
    const mapped = mapper.mapHttpStatus(400, { message: "Bad request" }, { providerCode: "MTN_MOMO" });
    assert.equal(mapped.code, "PROVIDER_HTTP_400");
  });
});
