const RuntimeConfig = require("./RuntimeConfig");
const ProviderSandboxConfig = require("./ProviderSandboxConfig");
const RuntimeFeatureFlagRegistry = require("./RuntimeFeatureFlagRegistry");
const RuntimeExecutionGuardError = require("./errors/RuntimeExecutionGuardError");
const MTNMoMoCredentials = require("./mtn/MTNMoMoCredentials");
const PaypackCredentials = require("./paypack/PaypackCredentials");
const MTNMoMoConfig = require("./mtn/MTNMoMoConfig");

/**
 * Focused runtime safety guard — single-responsibility assert methods only.
 */
class RuntimeExecutionGuard {
  constructor({ runtimeFeatureFlags, environmentResolver, runtimeConfig, env } = {}) {
    this.runtimeFeatureFlags =
      runtimeFeatureFlags || new RuntimeFeatureFlagRegistry();
    this.environmentResolver = environmentResolver || null;
    this.runtimeConfig = runtimeConfig || RuntimeConfig;
    this.env = env || process.env;
  }

  assertEnvironment(environment) {
    const env = String(environment || "").trim().toLowerCase();
    if (env !== "sandbox") {
      throw new RuntimeExecutionGuardError(
        `RuntimeExecutionGuard: environment "${environment}" is not allowed (sandbox only)`,
        { code: "ENVIRONMENT_NOT_SANDBOX", environment: env }
      );
    }
  }

  assertExecutionAllowed(options = {}) {
    const liveEnabled =
      options.liveExecutionEnabled ?? this.runtimeConfig.liveExecutionEnabled;
    if (liveEnabled) {
      throw new RuntimeExecutionGuardError(
        "RuntimeExecutionGuard: live execution path is blocked",
        { code: "LIVE_EXECUTION_BLOCKED" }
      );
    }
  }

  assertLiveExecutionPrevented(options = {}) {
    const env = options.env || this.env;
    const envVarName = this.runtimeConfig.paymentRuntimeLiveEnvVar || "PAYMENT_RUNTIME_LIVE";
    const liveFlag = String(env[envVarName] || "")
      .trim()
      .toLowerCase();
    if (liveFlag === "true" || liveFlag === "1") {
      throw new RuntimeExecutionGuardError(
        `RuntimeExecutionGuard: ${envVarName}=true is blocked`,
        { code: "LIVE_EXECUTION_ENV_BLOCKED", environment: liveFlag }
      );
    }
  }

  assertFeatureFlags(providerCode) {
    this.assertRuntimeEnabled(providerCode);
  }

  assertRuntimeEnabled(providerCode) {
    const code = String(providerCode || "").trim().toUpperCase();
    if (!this.runtimeFeatureFlags.isEnabled("runtimeSandboxEnabled")) {
      throw new RuntimeExecutionGuardError(
        "RuntimeExecutionGuard: runtime sandbox is disabled",
        { code: "RUNTIME_SANDBOX_DISABLED", providerCode: code }
      );
    }

    const providerFlag = RuntimeFeatureFlagRegistry.getProviderRuntimeFlagName(code);
    if (!providerFlag || !this.runtimeFeatureFlags.isEnabled(providerFlag)) {
      throw new RuntimeExecutionGuardError(
        `RuntimeExecutionGuard: provider runtime disabled for ${code}`,
        { code: "PROVIDER_RUNTIME_DISABLED", providerCode: code }
      );
    }
  }

  assertCredentials(credentialResult, { providerCode, scope, product, required = true } = {}) {
    const code = String(providerCode || credentialResult?.providerCode || "")
      .trim()
      .toUpperCase();

    if (!credentialResult?.found) {
      if (required) {
        throw new RuntimeExecutionGuardError(
          `RuntimeExecutionGuard: credentials not found for ${code}`,
          { code: "CREDENTIALS_NOT_FOUND", providerCode: code }
        );
      }
      return;
    }

    if (code === MTNMoMoConfig.providerCode) {
      const resolved = MTNMoMoCredentials.resolveScope(
        credentialResult,
        scope || MTNMoMoConfig.scopes.collection
      );
      if (!resolved.subscriptionKey || !resolved.apiUser || !resolved.apiKey) {
        throw new RuntimeExecutionGuardError(
          `RuntimeExecutionGuard: MTN credentials incomplete for scope ${scope || "collection"}`,
          { code: "CREDENTIALS_INCOMPLETE", providerCode: code }
        );
      }
      return;
    }

    if (code === "PAYPACK") {
      const resolved = PaypackCredentials.resolveProduct(credentialResult, product || "default");
      PaypackCredentials.assertAuthResolvable({ auth: resolved });
      return;
    }

    if (required && Object.keys(credentialResult.credentials || {}).length === 0) {
      throw new RuntimeExecutionGuardError(
        `RuntimeExecutionGuard: credentials empty for ${code}`,
        { code: "CREDENTIALS_INCOMPLETE", providerCode: code }
      );
    }
  }

  assertSandbox(providerCode, resolvedEnvironment) {
    const code = String(providerCode || "").trim().toUpperCase();
    const env = resolvedEnvironment || this._resolveEnvironment(code);

    if (env.environment !== "sandbox") {
      throw new RuntimeExecutionGuardError(
        `RuntimeExecutionGuard: resolved environment is not sandbox for ${code}`,
        { code: "ENVIRONMENT_NOT_SANDBOX", providerCode: code, environment: env.environment }
      );
    }

    if (env.liveExecutionEnabled === true) {
      throw new RuntimeExecutionGuardError(
        `RuntimeExecutionGuard: live execution enabled in resolved environment for ${code}`,
        { code: "LIVE_EXECUTION_BLOCKED", providerCode: code }
      );
    }

    const sandbox = ProviderSandboxConfig[code];
    if (!sandbox) {
      throw new RuntimeExecutionGuardError(
        `RuntimeExecutionGuard: no sandbox config for ${code}`,
        { code: "SANDBOX_CONFIG_MISSING", providerCode: code }
      );
    }

    if (env.baseUrl !== sandbox.baseUrl) {
      throw new RuntimeExecutionGuardError(
        `RuntimeExecutionGuard: baseUrl does not match sandbox config for ${code}`,
        { code: "SANDBOX_ENDPOINT_MISMATCH", providerCode: code }
      );
    }
  }

  assertSandboxEnforcement(providerCode, resolvedEnvironment) {
    this.assertSandbox(providerCode, resolvedEnvironment);
  }

  _resolveEnvironment(providerCode) {
    if (!this.environmentResolver) {
      throw new RuntimeExecutionGuardError(
        "RuntimeExecutionGuard: environmentResolver is required for assertSandbox",
        { code: "ENVIRONMENT_RESOLVER_MISSING", providerCode }
      );
    }
    return this.environmentResolver.resolve(providerCode, "sandbox");
  }
}

module.exports = RuntimeExecutionGuard;
