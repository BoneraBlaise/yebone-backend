const RuntimeConfig = require("./RuntimeConfig");
const ProviderSandboxConfig = require("./ProviderSandboxConfig");

/**
 * Resolves provider environment and base URLs — sandbox only at Phase 1.
 */
class ProviderEnvironmentResolver {
  constructor(options = {}) {
    this.defaultEnvironment = options.defaultEnvironment || RuntimeConfig.defaultEnvironment;
  }

  resolve(providerCode, environment = this.defaultEnvironment) {
    const code = String(providerCode || "").trim().toUpperCase();
    const env = String(environment || this.defaultEnvironment).trim().toLowerCase();

    if (env !== "sandbox") {
      throw new Error(`ProviderEnvironmentResolver: live environment blocked at Module 10 Phase 1 (${code})`);
    }

    const sandbox = ProviderSandboxConfig[code];
    if (!sandbox) {
      throw new Error(`ProviderEnvironmentResolver: no sandbox config for ${code}`);
    }

    return Object.freeze({
      providerCode: code,
      environment: "sandbox",
      baseUrl: sandbox.baseUrl,
      collectionOauthPath: sandbox.collectionOauthPath || null,
      disbursementOauthPath: sandbox.disbursementOauthPath || null,
      collectionPath: sandbox.collectionPath || null,
      disbursementPath: sandbox.disbursementPath || null,
      apiUserPath: sandbox.apiUserPath || null,
      liveExecutionEnabled: false,
    });
  }
}

module.exports = ProviderEnvironmentResolver;
