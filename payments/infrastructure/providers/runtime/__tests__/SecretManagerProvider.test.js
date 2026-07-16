const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  NoOpSecretManagerProvider,
  SecretManagerProvider,
} = require("../credentials/SecretManagerProvider");
const SecretManagerCredentialProvider = require("../credentials/SecretManagerCredentialProvider");
const { NoOpVaultProvider, VaultProvider } = require("../credentials/VaultProvider");
const VaultCredentialProvider = require("../credentials/VaultCredentialProvider");

describe("SecretManagerProvider", () => {
  it("noop provider returns healthy status and no secrets", async () => {
    const provider = new NoOpSecretManagerProvider();
    assert.equal(await provider.exists("any"), false);
    assert.equal(await provider.load("any"), null);
    assert.deepEqual(await provider.health(), { ok: true, provider: "noop" });
  });

  it("secret manager credential provider uses injected provider", async () => {
    const secretManager = {
      async exists() {
        return true;
      },
      async load() {
        return Object.freeze({ apiKey: "from-secret-manager" });
      },
      async health() {
        return { ok: true, provider: "mock" };
      },
    };

    const provider = new SecretManagerCredentialProvider({ secretManager });
    const result = await provider.getCredentials("MTN_MOMO");
    assert.equal(result.found, true);
    assert.equal(result.source, "secret_manager");
    assert.equal(result.credentials.apiKey, "from-secret-manager");
    assert.equal(await provider.health().then((h) => h.provider), "mock");
  });

  it("requires concrete SecretManagerProvider methods", async () => {
    const provider = new SecretManagerProvider();
    await assert.rejects(() => provider.load("key"), /must be implemented/);
  });
});

describe("VaultProvider", () => {
  it("noop vault provider returns healthy status and no secrets", async () => {
    const provider = new NoOpVaultProvider();
    assert.equal(await provider.exists("any"), false);
    assert.equal(await provider.load("any"), null);
    assert.deepEqual(await provider.health(), { ok: true, provider: "noop" });
  });

  it("vault credential provider uses injected provider", async () => {
    const vault = {
      async exists() {
        return true;
      },
      async load() {
        return Object.freeze({ clientSecret: "from-vault" });
      },
      async health() {
        return { ok: true, provider: "mock-vault" };
      },
    };

    const provider = new VaultCredentialProvider({ vault });
    const result = await provider.getCredentials("PAYPACK");
    assert.equal(result.found, true);
    assert.equal(result.source, "vault");
    assert.equal(result.credentials.clientSecret, "from-vault");
  });

  it("requires concrete VaultProvider methods", async () => {
    const provider = new VaultProvider();
    await assert.rejects(() => provider.health(), /must be implemented/);
  });
});
