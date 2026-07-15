const {
  ExecutionStage,
  STAGE_ORDER,
  STAGE_INDEX,
  assertExecutionStage,
} = require("./ExecutionStage");

/**
 * Diagnostics, tracing, and monitoring helpers for pipeline execution.
 * Read-only — does not mutate context or alter stage ordering.
 */
class PaymentExecutionDiagnostics {
  static snapshot(context = {}) {
    const completedStages = [...(context.completedStages || [])];
    const currentStage = context.currentStage || completedStages[completedStages.length - 1] || null;

    return Object.freeze({
      correlationId: context.trace?.correlationId || null,
      requestId: context.trace?.requestId || null,
      traceId: context.trace?.traceId || null,
      currentStage,
      completedStages: Object.freeze(completedStages),
      progress: PaymentExecutionDiagnostics.progress(completedStages),
      monitoring: PaymentExecutionDiagnostics.monitoring(completedStages, currentStage),
    });
  }

  static progress(completedStages = []) {
    const completed = completedStages.length;
    const total = STAGE_ORDER.length;
    const nextStage = STAGE_ORDER[completed] || null;

    return Object.freeze({
      completed,
      total,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      nextStage,
      terminal: completedStages.includes(ExecutionStage.COMPLETE),
    });
  }

  static monitoring(completedStages = [], currentStage = null) {
    const stage = currentStage || completedStages[completedStages.length - 1] || null;
    const stageIndex = stage ? STAGE_INDEX[stage] : -1;

    return Object.freeze({
      stage,
      stageIndex,
      stageCount: STAGE_ORDER.length,
      failed: false,
      complete: completedStages.includes(ExecutionStage.COMPLETE),
    });
  }

  static traceStage(context = {}, stage) {
    assertExecutionStage(stage);
    const trace = context.trace || {};

    return Object.freeze({
      ...trace,
      pipelineStage: stage,
      pipelineStageIndex: STAGE_INDEX[stage],
    });
  }

  static failureTrace(context = {}, stage, error = {}) {
    assertExecutionStage(stage);

    return Object.freeze({
      ...PaymentExecutionDiagnostics.traceStage(context, stage),
      pipelineFailed: true,
      pipelineError: error.message || String(error),
      pipelineErrorCode: error.code || null,
    });
  }
}

module.exports = PaymentExecutionDiagnostics;
