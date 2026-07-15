const { assertExecutionStage } = require("../ExecutionStage");
const PaymentExecutionDiagnostics = require("../PaymentExecutionDiagnostics");

class PipelineExecutionError extends Error {
  constructor(stage, message, details = {}) {
    assertExecutionStage(stage);
    super(`Pipeline failed at ${stage}: ${message}`);
    this.name = "PipelineExecutionError";
    this.code = "PIPELINE_EXECUTION_ERROR";
    this.stage = stage;
    this.details = Object.freeze({
      ...details,
      diagnostics: details.diagnostics || null,
    });
  }

  static fromStageFailure(stage, error, context = {}) {
    return new PipelineExecutionError(stage, error.message, {
      cause: error.name,
      diagnostics: PaymentExecutionDiagnostics.snapshot({
        ...context,
        currentStage: stage,
      }),
      trace: PaymentExecutionDiagnostics.failureTrace(context, stage, error),
    });
  }
}

module.exports = PipelineExecutionError;
