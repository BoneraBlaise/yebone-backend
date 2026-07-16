const { randomUUID } = require("node:crypto");
const PaypackConfig = require("./PaypackConfig");

/**
 * Paypack transaction verification client — sandbox architecture.
 */
class PaypackVerifyClient {
  constructor({ authClient, httpClient, environmentResolver }) {
    this.authClient = authClient;
    this.httpClient = httpClient;
    this.environmentResolver = environmentResolver;
    this.providerCode = PaypackConfig.providerCode;
  }

  async findTransaction(referenceId, { kind, metrics, correlationId } = {}) {
    const token = await this.authClient.acquireToken(PaypackConfig.scopes.default, {
      metrics,
      correlationId,
    });
    const env = this.environmentResolver.resolve(this.providerCode);
    const url = `${env.baseUrl}${PaypackConfig.sandbox.findPath}/${referenceId}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "verify",
      method: "GET",
      url,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
      signing: {
        bearerToken: token.accessToken,
        correlationId: correlationId || randomUUID(),
      },
      metrics,
    });

    const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;

    return Object.freeze({
      status: this._normalizeStatus(body?.status),
      providerReference: body?.ref || referenceId,
      financialTransactionId: body?.ref || null,
      kind: body?.kind || kind || null,
      client: body?.client || null,
      amount: body?.amount ?? null,
      sandbox: true,
      raw: body,
    });
  }

  async findEvents(referenceId, { kind, client } = {}) {
    const token = await this.authClient.acquireToken(PaypackConfig.scopes.default);
    const env = this.environmentResolver.resolve(this.providerCode);
    const params = new URLSearchParams({ ref: referenceId });
    if (kind) {
      params.set("kind", kind);
    }
    if (client) {
      params.set("client", client);
    }

    const url = `${env.baseUrl}${PaypackConfig.sandbox.eventsPath}?${params.toString()}`;

    const response = await this.httpClient.request({
      providerCode: this.providerCode,
      operation: "verify_events",
      method: "GET",
      url,
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
      signing: {
        bearerToken: token.accessToken,
        correlationId: randomUUID(),
      },
    });

    const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;
    const latest = Array.isArray(body?.transactions) ? body.transactions[0]?.data : null;

    return Object.freeze({
      status: this._normalizeStatus(latest?.status || body?.status),
      providerReference: latest?.ref || referenceId,
      financialTransactionId: latest?.ref || null,
      kind: latest?.kind || kind || null,
      sandbox: true,
      raw: body,
    });
  }

  _normalizeStatus(status) {
    const normalized = String(status || "UNKNOWN").trim().toUpperCase();
    if (normalized === "SUCCESSFUL" || normalized === "SUCCESS") {
      return "SUCCESSFUL";
    }
    if (normalized === "FAILED" || normalized === "FAIL") {
      return "FAILED";
    }
    if (normalized === "PENDING") {
      return "PENDING";
    }
    return normalized;
  }
}

module.exports = PaypackVerifyClient;
