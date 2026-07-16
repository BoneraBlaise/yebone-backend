const { ProviderOperation } = require("../ProviderOperation");
const ProviderResponse = require("../models/ProviderResponse");
const RuntimeExecutionGuardError = require("./errors/RuntimeExecutionGuardError");
const ProviderCapabilityError = require("../errors/ProviderCapabilityError");
const { createExecutionResult } = require("./ExecutionResult");
const CorrelationContext = require("./observability/CorrelationContext");
const { ProviderRuntimeDiagnosticsCollector } = require("./observability/ProviderRuntimeDiagnostics");

/**
 * Coordinates injected runtime collaborators — constructor injection only (ADR-008).
 * Never instantiates dependencies or invokes the composition root.
 */
class ProviderExecutionOrchestrator {
  constructor({
    providerAdapterResolver,
    runtimeAdapterResolver,
    runtimeExecutionGuard,
    providerCapabilityValidator,
  }) {
    if (!providerAdapterResolver) {
      throw new Error("ProviderExecutionOrchestrator requires providerAdapterResolver");
    }
    if (!runtimeAdapterResolver) {
      throw new Error("ProviderExecutionOrchestrator requires runtimeAdapterResolver");
    }
    if (!runtimeExecutionGuard) {
      throw new Error("ProviderExecutionOrchestrator requires runtimeExecutionGuard");
    }
    if (!providerCapabilityValidator) {
      throw new Error("ProviderExecutionOrchestrator requires providerCapabilityValidator");
    }

    this.providerAdapterResolver = providerAdapterResolver;
    this.runtimeAdapterResolver = runtimeAdapterResolver;
    this.runtimeExecutionGuard = runtimeExecutionGuard;
    this.providerCapabilityValidator = providerCapabilityValidator;
  }

  async charge(input = {}, trace = {}) {
    return this._execute(ProviderOperation.CHARGE, input, trace);
  }

  async verify(input = {}, trace = {}) {
    return this._execute(ProviderOperation.VERIFY, input, trace);
  }

  async payout(input = {}, trace = {}) {
    return this._execute(ProviderOperation.PAYOUT, input, trace);
  }

  async refund(input = {}, trace = {}) {
    return this._execute(ProviderOperation.REFUND, input, trace);
  }

  async _execute(operation, input, trace) {
    const correlation = new CorrelationContext({
      correlationId: trace.correlationId || input.correlationId,
      executionId: trace.executionId || input.executionId,
    });

    const diagnostics = new ProviderRuntimeDiagnosticsCollector({
      correlationId: correlation.correlationId,
    });

    let decision = null;
    let timeline = null;

    try {
      const resolved = this.providerAdapterResolver.resolve({
        providerCode: input.providerCode,
        countryCode: input.countryCode || input.country,
        currency: input.currency,
        paymentMethod: input.paymentMethod,
      });

      decision = this.runtimeAdapterResolver.resolve({
        providerCode: resolved.descriptor.code,
        environment: input.environment || "sandbox",
      });

      diagnostics.attachExecutionDecision(decision);

      timeline = correlation.createTimelineRecorder({
        providerCode: decision.providerCode,
        executionMode: decision.executionMode,
        operation,
        decisionReason: decision.reason,
        fallbackAllowed: decision.fallbackAllowed,
      });

      timeline.recordStage("START");
      timeline.recordStage("RESOLVE_PROVIDER");

      if (decision.executionMode === "RUNTIME_SANDBOX") {
        this._assertRuntimeGuards(decision.providerCode);
        timeline.recordStage("AUTHENTICATE");
        timeline.recordStage("REQUEST_SIGNING");
        timeline.recordStage("HTTP_REQUEST");
      }

      this.providerCapabilityValidator.validate(resolved.descriptor, operation);

      const adapter = decision.adapter;
      if (!adapter || typeof adapter[operation] !== "function") {
        const failedTimeline = timeline.fail();
        diagnostics.attachExecutionTimeline(failedTimeline);
        return this._failureResult({
          correlation,
          decision,
          timeline: failedTimeline,
          diagnostics,
          errorCode: "ADAPTER_UNAVAILABLE",
          message: `No adapter available for ${operation} on ${decision.providerCode}`,
        });
      }

      const providerResponse = await adapter[operation]({
        ...input,
        providerCode: decision.providerCode,
      });

      if (decision.executionMode === "RUNTIME_SANDBOX") {
        timeline.recordStage("HTTP_RESPONSE");
      }
      timeline.recordStage("NORMALIZE_RESPONSE");

      const closedTimeline = timeline.complete();
      diagnostics.attachExecutionTimeline(closedTimeline);

      const normalizedResponse = ProviderResponse.fromResult(providerResponse);
      const success = normalizedResponse.success !== false;

      return createExecutionResult({
        success,
        providerResponse: normalizedResponse,
        executionDecision: decision,
        executionTimeline: closedTimeline,
        diagnostics: diagnostics.snapshot(),
        executionMode: decision.executionMode,
        correlationId: correlation.correlationId,
      });
    } catch (error) {
      return this._handleExecutionError(error, {
        correlation,
        timeline,
        diagnostics,
        decision,
        operation,
        input,
      });
    }
  }

  _assertRuntimeGuards(providerCode) {
    this.runtimeExecutionGuard.assertExecutionAllowed();
    this.runtimeExecutionGuard.assertLiveExecutionPrevented();
    this.runtimeExecutionGuard.assertRuntimeEnabled(providerCode);
    this.runtimeExecutionGuard.assertSandbox(providerCode);
  }

  _handleExecutionError(error, { correlation, timeline, diagnostics, decision, operation, input }) {
    if (!decision) {
      try {
        decision = this.runtimeAdapterResolver.resolve({
          providerCode: input.providerCode,
          environment: input.environment || "sandbox",
        });
        diagnostics.attachExecutionDecision(decision);
      } catch {
        decision = {
          executionMode: "MOCK",
          providerCode: String(input.providerCode || "UNKNOWN").trim().toUpperCase(),
          adapter: null,
          descriptor: { code: input.providerCode || "UNKNOWN" },
          reason: "fallbackDefault",
          fallbackAllowed: true,
        };
      }
    }

    if (!timeline) {
      timeline = correlation.createTimelineRecorder({
        providerCode: decision.providerCode,
        executionMode: decision.executionMode,
        operation,
        decisionReason: decision.reason,
        fallbackAllowed: decision.fallbackAllowed,
      });
      timeline.recordStage("START");
    }

    const failedTimeline = timeline.fail();
    diagnostics.attachExecutionTimeline(failedTimeline);

    const message =
      error instanceof RuntimeExecutionGuardError || error instanceof ProviderCapabilityError
        ? error.message
        : String(error?.message || error || "Provider execution failed");

    const errorCode =
      error instanceof RuntimeExecutionGuardError
        ? error.code || "RUNTIME_GUARD_REJECTED"
        : error instanceof ProviderCapabilityError
          ? "CAPABILITY_NOT_SUPPORTED"
          : "EXECUTION_FAILED";

    return this._failureResult({
      correlation,
      decision,
      timeline: failedTimeline,
      diagnostics,
      errorCode,
      message,
      providerResponse: ProviderResponse.failure(error),
    });
  }

  _failureResult({
    correlation,
    decision,
    timeline,
    diagnostics,
    errorCode,
    message,
    providerResponse = null,
  }) {
    const response =
      providerResponse ||
      ProviderResponse.fromResult({
        success: false,
        mock: decision.executionMode === "MOCK",
        providerCode: decision.providerCode,
        status: errorCode,
        metadata: Object.freeze({ message }),
      });

    return createExecutionResult({
      success: false,
      providerResponse: response,
      executionDecision: decision,
      executionTimeline: timeline,
      diagnostics: diagnostics.snapshot(),
      executionMode: decision.executionMode,
      correlationId: correlation.correlationId,
    });
  }
}

module.exports = ProviderExecutionOrchestrator;
