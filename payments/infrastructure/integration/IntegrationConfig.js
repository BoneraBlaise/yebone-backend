const { STAGE_ORDER } = require("./ExecutionStage");

const IntegrationConfig = Object.freeze({
  version: "8.0.0-integration-gate",
  pipelineVersion: "1.0",
  defaultCurrency: "UGX",
  stages: STAGE_ORDER,
});

module.exports = IntegrationConfig;
