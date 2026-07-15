/**
 * Strongly typed, immutable execution stage definitions for the integration pipeline.
 */
const ExecutionStage = Object.freeze({
  ENGINE: "ENGINE",
  IDEMPOTENCY: "IDEMPOTENCY",
  TRANSACTION: "TRANSACTION",
  COMMISSION: "COMMISSION",
  LEDGER: "LEDGER",
  WALLET: "WALLET",
  AUDIT: "AUDIT",
  EVENTS: "EVENTS",
  COMPLETE: "COMPLETE",
});

const STAGE_ORDER = Object.freeze([
  ExecutionStage.ENGINE,
  ExecutionStage.IDEMPOTENCY,
  ExecutionStage.TRANSACTION,
  ExecutionStage.COMMISSION,
  ExecutionStage.LEDGER,
  ExecutionStage.WALLET,
  ExecutionStage.AUDIT,
  ExecutionStage.EVENTS,
  ExecutionStage.COMPLETE,
]);

const STAGE_VALUES = Object.freeze(Object.values(ExecutionStage));

const STAGE_INDEX = Object.freeze(
  STAGE_ORDER.reduce((acc, stage, index) => {
    acc[stage] = index;
    return acc;
  }, {})
);

function isExecutionStage(value) {
  return typeof value === "string" && STAGE_VALUES.includes(value);
}

function assertExecutionStage(value) {
  if (!isExecutionStage(value)) {
    throw new Error(`Invalid execution stage: ${value}`);
  }
  return value;
}

function nextStageAfter(completedStages = []) {
  return STAGE_ORDER[completedStages.length] || null;
}

module.exports = Object.freeze({
  ExecutionStage,
  STAGE_ORDER,
  STAGE_VALUES,
  STAGE_INDEX,
  isExecutionStage,
  assertExecutionStage,
  nextStageAfter,
});
