/**
 * Yebone payment foundation — provider-agnostic module entry point.
 * v1 routes registered via payments/runtime; v2 legacy routes bridge through payments/legacy.
 */
module.exports = {
  PaymentModule: require("./PaymentModule"),
  PaymentService: require("./services/PaymentService"),
  PaymentConfig: require("./config/PaymentConfig"),
  PaymentFactory: require("./config/PaymentFactory"),
  ProviderResolver: require("./config/ProviderResolver"),
  contracts: {
    PaymentProviderInterface: require("./contracts/PaymentProviderInterface"),
  },
  domain: require("./domain"),
  enums: require("./enums"),
  providers: require("./providers"),
  repositories: require("./repositories"),
  workflows: require("./workflows"),
  events: require("./events"),
  ledger: require("./ledger"),
  delivery: require("./delivery"),
  financial: require("./financial"),
  orchestration: require("./orchestration"),
  api: require("./api"),
  runtime: require("./runtime"),
  infrastructure: require("./infrastructure"),
  legacy: require("./legacy"),
  errors: {
    NotImplementedError: require("./errors/NotImplementedError"),
  },
};
