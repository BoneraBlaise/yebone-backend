const { randomUUID } = require("node:crypto");
const ProviderAuthentication = require("../ProviderAuthentication");
const ProviderRequestSigner = require("../ProviderRequestSigner");
const ProviderAuthError = require("../errors/ProviderAuthError");
const MTNMoMoConfig = require("./MTNMoMoConfig");
const MTNMoMoCredentials = require("./MTNMoMoCredentials");
const { emitRuntimeMetric } = require("../observability/RuntimeMetricsEmitter");

/**
 * MTN MoMo OAuth token acquisition — sandbox only.
 */
class MTNMoMoOAuthClient extends ProviderAuthentication {
  constructor({ credentialStore, tokenCache, httpClient, environmentResolver }) {
    super({ credentialStore, tokenCache });
    this.httpClient = httpClient;
    this.environmentResolver = environmentResolver;
    this.providerCode = MTNMoMoConfig.providerCode;
  }

  async acquireToken(scope = MTNMoMoConfig.scopes.collection, options = {}) {
    const metrics = options.metrics || null;
    const cached = await this.getCachedToken(this.providerCode, scope);
    if (cached?.accessToken) {
      emitRuntimeMetric(metrics, "oauth_cache_hit");
      return cached;
    }
    emitRuntimeMetric(metrics, "oauth_cache_miss");

    const credentialResult = await this.credentialStore.load(this.providerCode, { required: true });
    this.assertCredentials(credentialResult, this.providerCode);

    const { apiUser, apiKey, subscriptionKey, targetEnvironment } = MTNMoMoCredentials.resolveScope(
      credentialResult,
      scope
    );
    if (!apiUser || !apiKey || !subscriptionKey) {
      throw new ProviderAuthError("MTN MoMo credentials incomplete", { providerCode: this.providerCode });
    }

    const env = this.environmentResolver.resolve(this.providerCode);
    const oauthPath = MTNMoMoOAuthClient._resolveOauthPath(scope);
    const url = `${env.baseUrl}${oauthPath}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "oauth",
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: ProviderRequestSigner.basicAuth(apiUser, apiKey),
        [MTNMoMoConfig.sandbox.targetEnvironmentHeader]: targetEnvironment || "sandbox",
      },
      signing: { subscriptionKey },
      correlationId: options.correlationId || randomUUID(),
      metrics,
    });

    const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;
    if (!body?.access_token) {
      throw new ProviderAuthError("MTN MoMo OAuth response missing access_token", {
        providerCode: this.providerCode,
      });
    }

    const token = Object.freeze({
      accessToken: body.access_token,
      tokenType: body.token_type || "Bearer",
      expiresIn: body.expires_in || 3600,
      scope,
    });

    await this.setCachedToken(this.providerCode, scope, token, token.expiresIn);
    return token;
  }

  static _resolveOauthPath(scope) {
    const normalizedScope = String(scope || MTNMoMoConfig.scopes.collection).toLowerCase();
    if (normalizedScope === MTNMoMoConfig.scopes.disbursement) {
      return MTNMoMoConfig.sandbox.disbursementOauthPath;
    }
    return MTNMoMoConfig.sandbox.collectionOauthPath;
  }
}

module.exports = MTNMoMoOAuthClient;
