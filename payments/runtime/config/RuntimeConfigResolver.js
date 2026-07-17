/**
 * Resolves RuntimeConfig fields from environment — explicit opt-in only, defaults false.
 */
class RuntimeConfigResolver {
  static ENV_MAP = Object.freeze({
    PAYMENT_COMPOSE_FOUNDATION: "composePaymentFoundation",
    PAYMENT_ENABLE_WEBHOOKS: "enableWebhooks",
    PAYMENT_APPLY_FEATURE_FLAG_ROLLOUT: "applyFeatureFlagRollout",
    PAYMENT_WEBHOOK_RECONCILIATION: "enableWebhookReconciliation",
    PAYMENT_WEBHOOK_SETTLEMENT: "enableWebhookSettlement",
    PAYMENT_LEGACY_ROUTING_POLICY: "enableLegacyRoutingPolicy",
  });

  static resolve(env = process.env, baseOptions = {}) {
    const resolved = { ...(baseOptions || {}) };

    for (const [envKey, field] of Object.entries(RuntimeConfigResolver.ENV_MAP)) {
      const value = env[envKey];
      if (value === undefined || value === null || value === "") {
        continue;
      }
      resolved[field] = RuntimeConfigResolver._isTruthy(value);
    }

    return Object.freeze(resolved);
  }

  static describeEnvKeys() {
    return Object.freeze(Object.keys(RuntimeConfigResolver.ENV_MAP));
  }

  static _isTruthy(value) {
    const normalized = String(value).trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  }
}

module.exports = RuntimeConfigResolver;
