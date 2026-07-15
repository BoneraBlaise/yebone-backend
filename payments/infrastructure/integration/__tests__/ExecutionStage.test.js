const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  ExecutionStage,
  STAGE_ORDER,
  STAGE_VALUES,
  isExecutionStage,
  assertExecutionStage,
  nextStageAfter,
} = require("../ExecutionStage");

describe("ExecutionStage", () => {
  it("defines the canonical frozen stage map", () => {
    assert.equal(Object.isFrozen(ExecutionStage), true);
    assert.equal(Object.isFrozen(STAGE_ORDER), true);
    assert.equal(Object.isFrozen(STAGE_VALUES), true);
    assert.deepEqual(STAGE_ORDER, [
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
  });

  it("validates known stages", () => {
    assert.equal(isExecutionStage(ExecutionStage.COMPLETE), true);
    assert.equal(isExecutionStage("UNKNOWN"), false);
    assert.throws(() => assertExecutionStage("BAD"), /Invalid execution stage/);
  });

  it("resolves next stage from completed history", () => {
    assert.equal(nextStageAfter([]), ExecutionStage.ENGINE);
    assert.equal(nextStageAfter([ExecutionStage.ENGINE]), ExecutionStage.IDEMPOTENCY);
    assert.equal(nextStageAfter(STAGE_ORDER.slice(0, -1)), ExecutionStage.COMPLETE);
    assert.equal(nextStageAfter([...STAGE_ORDER]), null);
  });
});
