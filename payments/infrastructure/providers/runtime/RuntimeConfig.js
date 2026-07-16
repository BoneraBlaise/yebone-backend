/**
 * Module 10 — Provider runtime configuration.
 * Sandbox-first; live execution blocked unless explicitly injected in tests.
 */
const RuntimeConfig = Object.freeze({
  version: "10.0.0-provider-runtime-phase1",
  defaultEnvironment: "sandbox",
  liveExecutionEnabled: false,
  paymentRuntimeLiveEnvVar: "PAYMENT_RUNTIME_LIVE",
  defaultTimeoutMs: 15000,
  defaultMaxRetries: 2,
  correlationHeader: "X-Correlation-Id",
  idempotencyHeader: "X-Reference-Id",
});

module.exports = RuntimeConfig;
