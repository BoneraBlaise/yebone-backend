const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  createCredentialRotationMetadata,
  isExpired,
} = require("../credentials/CredentialRotationMetadata");
const CredentialRefreshService = require("../credentials/CredentialRefreshService");
const EnvironmentCredentialProvider = require("../credentials/EnvironmentCredentialProvider");
const ProviderCredentialStore = require("../ProviderCredentialStore");

describe("Credential rotation architecture", () => {
  it("creates immutable rotation metadata", () => {
    const rotation = createCredentialRotationMetadata({
      version: 2,
      expiresAt: "2099-01-01T00:00:00.000Z",
      rotatedAt: "2026-01-01T00:00:00.000Z",
    });

    assert.equal(rotation.version, 2);
    assert.equal(rotation.expiresAt, "2099-01-01T00:00:00.000Z");
    assert.equal(rotation.rotatedAt, "2026-01-01T00:00:00.000Z");
    assert.ok(Object.isFrozen(rotation));
  });

  it("detects expired credentials", () => {
    const expired = createCredentialRotationMetadata({
      expiresAt: "2000-01-01T00:00:00.000Z",
    });
    assert.equal(isExpired(expired, Date.parse("2026-01-01T00:00:00.000Z")), true);
    assert.equal(isExpired(createCredentialRotationMetadata({ expiresAt: null })), false);
  });

  it("loads credentials with rotation metadata", async () => {
    const store = new ProviderCredentialStore([
      new EnvironmentCredentialProvider({
        env: {
          MTN_MOMO_API_USER: "user",
          MTN_MOMO_API_KEY: "key",
          MTN_MOMO_SUBSCRIPTION_KEY: "sub",
          MTN_MOMO_CREDENTIAL_VERSION: "3",
          MTN_MOMO_CREDENTIAL_EXPIRES_AT: "2099-01-01T00:00:00.000Z",
        },
      }),
    ]);

    const refreshService = new CredentialRefreshService({
      credentialStore: store,
      env: {
        MTN_MOMO_CREDENTIAL_VERSION: "3",
        MTN_MOMO_CREDENTIAL_EXPIRES_AT: "2099-01-01T00:00:00.000Z",
      },
    });
    const loaded = await refreshService.load("MTN_MOMO", { required: true });
    assert.equal(loaded.rotation.version, 3);
    assert.equal(loaded.refreshed, false);
  });

  it("refresh increments version and marks refreshed", async () => {
    const store = new ProviderCredentialStore([
      new EnvironmentCredentialProvider({
        env: {
          MTN_MOMO_API_USER: "user",
          MTN_MOMO_API_KEY: "key",
          MTN_MOMO_SUBSCRIPTION_KEY: "sub",
          MTN_MOMO_CREDENTIAL_VERSION: "2",
        },
      }),
    ]);

    let now = Date.parse("2026-07-16T10:00:00.000Z");
    const refreshService = new CredentialRefreshService({
      credentialStore: store,
      env: {
        MTN_MOMO_CREDENTIAL_VERSION: "2",
      },
      clock: { now: () => now },
    });

    const refreshed = await refreshService.refresh("MTN_MOMO");
    assert.equal(refreshed.rotation.version, 3);
    assert.equal(refreshed.rotation.rotatedAt, "2026-07-16T10:00:00.000Z");
    assert.equal(refreshed.refreshed, true);
  });
});
