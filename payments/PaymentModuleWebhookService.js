const RuntimeExecutionGuardError = require("./infrastructure/providers/runtime/errors/RuntimeExecutionGuardError");

/**
 * PaymentModule webhook verification — reuses Module 9 adapter contracts via RuntimeAdapterResolver.
 * Does not redesign webhook contracts; delegates to adapter.verifyWebhook / verifySignature.
 */
class PaymentModuleWebhookService {
  constructor({ runtimeAdapterResolver, runtimeExecutionGuard }) {
    if (!runtimeAdapterResolver) {
      throw new Error("PaymentModuleWebhookService requires runtimeAdapterResolver");
    }
    this.runtimeAdapterResolver = runtimeAdapterResolver;
    this.runtimeExecutionGuard = runtimeExecutionGuard || null;
  }

  async verifyWebhook(input = {}) {
    const providerCode = String(input.providerCode || "").trim().toUpperCase();
    if (!providerCode) {
      throw new Error("providerCode is required");
    }

    const decision = this.runtimeAdapterResolver.resolve({
      providerCode,
      environment: input.environment || "sandbox",
    });

    if (decision.executionMode === "RUNTIME_SANDBOX" && this.runtimeExecutionGuard) {
      try {
        this.runtimeExecutionGuard.assertExecutionAllowed();
        this.runtimeExecutionGuard.assertLiveExecutionPrevented();
        this.runtimeExecutionGuard.assertRuntimeEnabled(providerCode);
        this.runtimeExecutionGuard.assertSandbox(providerCode);
      } catch (error) {
        throw error instanceof RuntimeExecutionGuardError
          ? error
          : new RuntimeExecutionGuardError(String(error?.message || error));
      }
    }

    const adapter = decision.adapter;
    if (!adapter || typeof adapter.verifyWebhook !== "function") {
      return Object.freeze({
        verified: false,
        mock: decision.executionMode === "MOCK",
        status: "ADAPTER_UNAVAILABLE",
        providerCode,
        executionMode: decision.executionMode,
        decisionReason: decision.reason,
        message: "Webhook adapter unavailable",
      });
    }

    const result = await adapter.verifyWebhook({
      ...input,
      providerCode,
      payload: input.payload,
      headers: input.headers || {},
      signature: input.signature,
      correlationId: input.correlationId,
    });

    return Object.freeze({
      ...result,
      providerCode,
      executionMode: decision.executionMode,
      decisionReason: decision.reason,
      fallbackAllowed: decision.fallbackAllowed,
    });
  }

  async verifySignature(input = {}) {
    const providerCode = String(input.providerCode || "").trim().toUpperCase();
    if (!providerCode) {
      throw new Error("providerCode is required");
    }

    const decision = this.runtimeAdapterResolver.resolve({
      providerCode,
      environment: input.environment || "sandbox",
    });

    const adapter = decision.adapter;
    if (!adapter || typeof adapter.verifySignature !== "function") {
      return Object.freeze({
        verified: false,
        mock: true,
        status: "ADAPTER_UNAVAILABLE",
        providerCode,
        executionMode: decision.executionMode,
      });
    }

    const result = await adapter.verifySignature({
      ...input,
      providerCode,
    });

    return Object.freeze({
      ...result,
      providerCode,
      executionMode: decision.executionMode,
      decisionReason: decision.reason,
    });
  }
}

module.exports = PaymentModuleWebhookService;
