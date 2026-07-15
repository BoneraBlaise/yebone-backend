const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createTestIntegrationFoundation } = require("./testHelpers");
const IntegrationHealthContract = require("../IntegrationHealthContract");
const IntegrationConfig = require("../IntegrationConfig");
const { ExecutionStage, STAGE_ORDER } = require("../ExecutionStage");

describe("IntegrationHealthContract", () => {
  let foundation;

  beforeEach(() => {
    foundation = createTestIntegrationFoundation();
  });

  it("reports all module readiness flags", () => {
    const health = IntegrationHealthContract.build(foundation.deps);

    assert.equal(health.version, IntegrationConfig.version);
    assert.equal(health.ready, true);
    assert.equal(health.modules[ExecutionStage.ENGINE], true);
    assert.equal(health.modules[ExecutionStage.IDEMPOTENCY], true);
    assert.equal(health.modules[ExecutionStage.TRANSACTION], true);
    assert.equal(health.modules[ExecutionStage.COMMISSION], true);
    assert.equal(health.modules[ExecutionStage.LEDGER], true);
    assert.equal(health.modules[ExecutionStage.WALLET], true);
    assert.equal(health.modules[ExecutionStage.AUDIT], true);
    assert.equal(health.modules[ExecutionStage.EVENTS], true);
    assert.deepEqual(health.stages, STAGE_ORDER);
    assert.equal(health.pipeline.terminalStage, ExecutionStage.COMPLETE);
  });

  it("gate health delegates to integration health contract", () => {
    const health = foundation.gate.health();
    assert.equal(health.ready, true);
    assert.ok(health.details.engine);
    assert.ok(health.details.ledger);
  });

  it("marks missing dependencies as not ready", () => {
    const health = IntegrationHealthContract.build({
      engine: foundation.deps.engine,
    });

    assert.equal(health.ready, false);
    assert.equal(health.modules[ExecutionStage.IDEMPOTENCY], false);
    assert.equal(health.modules[ExecutionStage.TRANSACTION], false);
  });
});
