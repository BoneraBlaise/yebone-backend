const MTNMoMoConfig = require("./MTNMoMoConfig");

/**
 * Resolves MTN MoMo credentials by OAuth scope (collection vs disbursement).
 * Disbursement credentials fall back to collection when scope-specific vars are absent.
 */
class MTNMoMoCredentials {
  static resolveScope(credentialResult, scope = MTNMoMoConfig.scopes.collection) {
    const credentials = credentialResult?.credentials || {};
    const normalizedScope = String(scope || MTNMoMoConfig.scopes.collection).toLowerCase();

    if (normalizedScope === MTNMoMoConfig.scopes.disbursement && credentials.disbursement) {
      return Object.freeze({ ...credentials.disbursement });
    }

    if (normalizedScope === MTNMoMoConfig.scopes.collection && credentials.collection) {
      return Object.freeze({ ...credentials.collection });
    }

    return Object.freeze({
      subscriptionKey: credentials.subscriptionKey || null,
      apiUser: credentials.apiUser || null,
      apiKey: credentials.apiKey || null,
      targetEnvironment: credentials.targetEnvironment || "sandbox",
    });
  }
}

module.exports = MTNMoMoCredentials;
