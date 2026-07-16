const { randomUUID } = require("node:crypto");
const ProviderAuthentication = require("../ProviderAuthentication");
const ProviderRequestSigner = require("../ProviderRequestSigner");
const ProviderAuthError = require("../errors/ProviderAuthError");
const PaypackConfig = require("./PaypackConfig");
const PaypackCredentials = require("./PaypackCredentials");

/**
 * Paypack authentication client — sandbox only, token cached via ProviderTokenCache.
 */
class PaypackAuthClient extends ProviderAuthentication {
  constructor({ credentialStore, tokenCache, httpClient, environmentResolver }) {
    super({ credentialStore, tokenCache });
    this.httpClient = httpClient;
    this.environmentResolver = environmentResolver;
    this.providerCode = PaypackConfig.providerCode;
  }

  async acquireToken(scope = PaypackConfig.scopes.default) {
    const cacheScope = String(scope || PaypackConfig.scopes.default).toLowerCase();
    const cached = await this.getCachedToken(this.providerCode, cacheScope);
    if (cached?.accessToken) {
      return cached;
    }

    const credentialResult = await this.credentialStore.load(this.providerCode, { required: true });
    this.assertCredentials(credentialResult, this.providerCode);

    const resolved = PaypackCredentials.assertAuthResolvable(PaypackCredentials.resolve(credentialResult));
    const { clientId, clientSecret, username, password, mode } = resolved.auth;

    const env = this.environmentResolver.resolve(this.providerCode);
    const url = `${env.baseUrl}${PaypackConfig.sandbox.authPath}`;

    const authorization =
      mode === "client_credentials"
        ? ProviderRequestSigner.basicAuth(clientId, clientSecret)
        : ProviderRequestSigner.basicAuth(username, password);

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "oauth",
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      correlationId: randomUUID(),
    });

    const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;
    const accessToken = body?.access || body?.access_token;
    if (!accessToken) {
      throw new ProviderAuthError("Paypack auth response missing access token", {
        providerCode: this.providerCode,
      });
    }

    const token = Object.freeze({
      accessToken,
      tokenType: "Bearer",
      expiresIn: body.expires_in || body.expires || 3600,
      scope: cacheScope,
    });

    await this.setCachedToken(this.providerCode, cacheScope, token, token.expiresIn);
    return token;
  }
}

module.exports = PaypackAuthClient;
