const { randomUUID } = require("node:crypto");
const MTNMoMoConfig = require("./MTNMoMoConfig");
const ProviderAuthError = require("../errors/ProviderAuthError");

/**
 * MTN MoMo API User / API Key provisioning — sandbox architecture only.
 */
class MTNMoMoApiUserService {
  constructor({ credentialStore, httpClient, environmentResolver }) {
    this.credentialStore = credentialStore;
    this.httpClient = httpClient;
    this.environmentResolver = environmentResolver;
    this.providerCode = MTNMoMoConfig.providerCode;
  }

  async createApiUser({ providerCallbackHost }) {
    const credentialResult = await this.credentialStore.load(this.providerCode, { required: true });
    const { subscriptionKey } = credentialResult.credentials;
    if (!subscriptionKey) {
      throw new ProviderAuthError("MTN MoMo subscription key required", { providerCode: this.providerCode });
    }

    const env = this.environmentResolver.resolve(this.providerCode);
    const referenceId = randomUUID();
    const url = `${env.baseUrl}${MTNMoMoConfig.sandbox.apiUserPath}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "api_user",
      method: "POST",
      url,
      headers: {
        "Content-Type": "application/json",
        "X-Reference-Id": referenceId,
      },
      body: {
        providerCallbackHost: providerCallbackHost || "https://sandbox.example.com/callback",
      },
      signing: { subscriptionKey, idempotencyKey: referenceId, correlationId: referenceId },
    });

    return Object.freeze({
      referenceId,
      status: response.status,
      sandbox: true,
    });
  }

  async createApiKey(apiUserId) {
    const credentialResult = await this.credentialStore.load(this.providerCode, { required: true });
    const { subscriptionKey } = credentialResult.credentials;
    if (!subscriptionKey || !apiUserId) {
      throw new ProviderAuthError("MTN MoMo subscription key and apiUserId required", {
        providerCode: this.providerCode,
      });
    }

    const env = this.environmentResolver.resolve(this.providerCode);
    const path = MTNMoMoConfig.sandbox.apiKeyPath.replace("{uuid}", apiUserId);
    const url = `${env.baseUrl}${path}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "api_key",
      method: "POST",
      url,
      headers: { "Content-Type": "application/json" },
      signing: { subscriptionKey, correlationId: randomUUID() },
    });

    const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;
    return Object.freeze({
      apiKey: body?.apiKey || null,
      status: response.status,
      sandbox: true,
    });
  }
}

module.exports = MTNMoMoApiUserService;
