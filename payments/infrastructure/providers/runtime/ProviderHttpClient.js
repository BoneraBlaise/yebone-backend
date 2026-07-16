const RuntimeConfig = require("./RuntimeConfig");
const ProviderHttpError = require("./errors/ProviderHttpError");
const ProviderTimeoutError = require("./errors/ProviderTimeoutError");
const { emitRuntimeMetric, observeRuntimeDuration } = require("./observability/RuntimeMetricsEmitter");

/**
 * Injectable HTTP client — live network blocked unless transport is injected (tests only).
 */
const BLOCKED_TRANSPORT = async () => {
  throw new ProviderHttpError("Live provider HTTP blocked at Module 10 Phase 1", {
    code: "PROVIDER_HTTP_BLOCKED",
  });
};

class ProviderHttpClient {
  constructor({
    transport,
    timeoutPolicy,
    retryPolicy,
    signer,
    liveExecutionEnabled = RuntimeConfig.liveExecutionEnabled,
  }) {
    this.transportInjected = Boolean(transport);
    this.transport = transport || BLOCKED_TRANSPORT;
    this.timeoutPolicy = timeoutPolicy;
    this.retryPolicy = retryPolicy;
    this.signer = signer;
    this.liveExecutionEnabled = Boolean(liveExecutionEnabled);
  }

  static createBlockedTransport() {
    return BLOCKED_TRANSPORT;
  }

  async request({
    providerCode,
    operation = "default",
    method = "GET",
    url,
    headers = {},
    body = null,
    correlationId = null,
    idempotencyKey = null,
    signing = {},
    metrics = null,
  } = {}) {
    if (!this.liveExecutionEnabled && !this.transportInjected) {
      throw new ProviderHttpError("Live provider HTTP blocked at Module 10 Phase 1", {
        code: "PROVIDER_HTTP_BLOCKED",
        providerCode,
      });
    }

    const timeout = this.timeoutPolicy?.resolve(operation)?.timeoutMs || RuntimeConfig.defaultTimeoutMs;
    const signedHeaders = this.signer
      ? this.signer.signRequest({
          headers,
          subscriptionKey: signing.subscriptionKey,
          bearerToken: signing.bearerToken,
          idempotencyKey,
          correlationId,
        })
      : headers;

    let attempt = 0;
    const startedAtMs = Date.now();
    while (true) {
      try {
        const response = await this._executeWithTimeout({
          method,
          url,
          headers: signedHeaders,
          body,
          timeoutMs: timeout,
          metrics,
        });

        if (response.status >= 400) {
          const error = new ProviderHttpError(`Provider HTTP ${response.status}`, {
            statusCode: response.status,
            providerCode,
            body: response.body,
          });
          if (this.retryPolicy?.shouldRetry({ attempt, operation, error })) {
            attempt += 1;
            emitRuntimeMetric(metrics, "provider_retry");
            await ProviderHttpClient._sleep(this.retryPolicy.nextDelayMs(attempt));
            continue;
          }
          observeRuntimeDuration(metrics, Date.now() - startedAtMs);
          throw error;
        }

        emitRuntimeMetric(metrics, "runtime_http");
        observeRuntimeDuration(metrics, Date.now() - startedAtMs);

        return Object.freeze({
          status: response.status,
          headers: Object.freeze({ ...(response.headers || {}) }),
          body: response.body,
          providerCode,
          operation,
          correlationId,
        });
      } catch (error) {
        const wrapped =
          error instanceof ProviderHttpError || error instanceof ProviderTimeoutError
            ? error
            : new ProviderHttpError(error.message, { providerCode, code: "PROVIDER_HTTP_FAILURE" });

        if (this.retryPolicy?.shouldRetry({ attempt, operation, error: wrapped })) {
          attempt += 1;
          emitRuntimeMetric(metrics, "provider_retry");
          await ProviderHttpClient._sleep(this.retryPolicy.nextDelayMs(attempt));
          continue;
        }
        if (wrapped instanceof ProviderTimeoutError) {
          emitRuntimeMetric(metrics, "provider_timeout");
        }
        observeRuntimeDuration(metrics, Date.now() - startedAtMs);
        throw wrapped;
      }
    }
  }

  async _executeWithTimeout({ method, url, headers, body, timeoutMs, metrics }) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        emitRuntimeMetric(metrics, "provider_timeout");
        reject(new ProviderTimeoutError(`Provider request timed out after ${timeoutMs}ms`, { timeoutMs }));
      }, timeoutMs);
    });

    try {
      return await Promise.race([
        this.transport({ method, url, headers, body }),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  static _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = ProviderHttpClient;
