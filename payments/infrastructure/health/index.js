const HealthCheckRegistry = require("./HealthCheckRegistry");
const ReadinessCheck = require("./ReadinessCheck");
const LivenessCheck = require("./LivenessCheck");
const DependencyCheck = require("./DependencyCheck");
const StartupCheck = require("./StartupCheck");
const RuntimeCheck = require("./RuntimeCheck");

function createDefaultHealthChecks({ paymentModule, monitoring }) {
  const registry = new HealthCheckRegistry();

  registry
    .register(
      new LivenessCheck({
        name: "process_alive",
        evaluator: () => true,
      })
    )
    .register(
      new StartupCheck({
        name: "payment_module_loaded",
        evaluator: () => Boolean(paymentModule),
      })
    )
    .register(
      new ReadinessCheck({
        name: "facade_ready",
        evaluator: () => Boolean(paymentModule?.getMarketplacePaymentFacade?.()),
      })
    )
    .register(
      new DependencyCheck({
        name: "financial_core",
        dependencyName: "settlement_engine",
        evaluator: () => Boolean(paymentModule?.getSettlementEngine?.()),
      })
    )
    .register(
      new DependencyCheck({
        name: "workflows",
        dependencyName: "order_payment_workflow",
        evaluator: () => Boolean(paymentModule?.getOrderPaymentWorkflow?.()),
      })
    )
    .register(
      new RuntimeCheck({
        name: "orchestration",
        evaluator: () => Boolean(paymentModule?.getTransactionCoordinator?.()),
      })
    );

  return {
    registry,
    async runAll() {
      const result = await registry.runAll();
      result.results.forEach((r) => monitoring?.health.recordCheck(r.name, r.healthy));
      return result;
    },
    async readiness() {
      return registry.runByType("readiness");
    },
    async liveness() {
      return registry.runByType("liveness");
    },
  };
}

module.exports = {
  HealthCheck: require("./HealthCheck"),
  HealthCheckRegistry,
  ReadinessCheck,
  LivenessCheck,
  DependencyCheck,
  StartupCheck,
  RuntimeCheck,
  createDefaultHealthChecks,
};
