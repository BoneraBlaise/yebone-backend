const { randomUUID } = require("node:crypto");
const ProviderAuthentication = require("../ProviderAuthentication");
const ProviderRequestSigner = require("../ProviderRequestSigner");
const ProviderAuthError = require("../errors/ProviderAuthError");
const PaypackConfig = require("./PaypackConfig");

/**
 * Paypack authentication client — sandbox architecture only.
 */
class PaypackAuthClient extends ProviderAuthentication {
  constructor({ credentialStore, tokenCache, httpClient, environmentResolver }) {
    super({ credentialStore, tokenCache });
    this.httpClient = httpClient;
    this.environmentResolver = environmentResolver;
    this.providerCode = PaypackConfig.providerCode;
  }

  async acquireToken() {
    const cached = await this.getCachedToken(this.providerCode, "default");
    if (cached?.accessToken) {
      return cached;
    }

    const credentialResult = await this.credentialStore.load(this.providerCode, { required: true });
    this.assertCredentials(credentialResult, this.providerCode);

    const { clientId, clientSecret } = credentialResult.credentials;
    if (!clientId || !clientSecret) {
      throw new ProviderAuthError("Paypack credentials incomplete", { providerCode: this.providerCode });
    }

    const env = this.environmentResolver.resolve(this.providerCode);
    const url = `${env.baseUrl}${PaypackConfig.sandbox.authPath}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "oauth",
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
        Authorization: ProviderRequestSigner.basicAuth(clientId, clientSecret),
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
      expiresIn: body.expires_in || 3600,
    });

    await this.setCachedToken(this.providerCode, "default", token, token.expiresIn);
    return token;
  }
}

module.exports = PaypackAuthClient;
