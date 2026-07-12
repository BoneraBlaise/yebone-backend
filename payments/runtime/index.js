const { DependencyInjectionBootstrap } = require("./bootstrap");
const { ModuleRegistration } = require("./registration");

/**
 * Registers the provider-independent payment module with Express.
 * Business controllers remain behind MarketplacePaymentFacade only.
 */
function registerPaymentRuntime(app, options = {}) {
  const runtime = DependencyInjectionBootstrap.create(options);
  const result = ModuleRegistration.register(app, runtime);
  return { runtime, result };
}

function createPaymentRuntime(options = {}) {
  return DependencyInjectionBootstrap.create(options);
}

module.exports = {
  registerPaymentRuntime,
  createPaymentRuntime,
  bootstrap: require("./bootstrap"),
  config: require("./config"),
  logging: require("./logging"),
  jobs: require("./jobs"),
  webhooks: require("./webhooks"),
  shutdown: require("./shutdown"),
  diagnostics: require("./diagnostics"),
  registration: require("./registration"),
};
