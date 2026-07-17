const { DependencyInjectionBootstrap } = require("./bootstrap");
const { ModuleRegistration } = require("./registration");

/**
 * Registers the provider-independent payment module with Express.
 * Business controllers remain behind MarketplacePaymentFacade only.
 */
const RuntimeConfig = require("./config/RuntimeConfig");
const RuntimeConfigResolver = require("./config/RuntimeConfigResolver");

function registerPaymentRuntime(app, options = {}) {
  const resolvedConfig = RuntimeConfigResolver.resolve(process.env, options.config || {});
  const config =
    resolvedConfig instanceof RuntimeConfig ? resolvedConfig : new RuntimeConfig(resolvedConfig);

  const runtime = DependencyInjectionBootstrap.create({
    ...options,
    config,
    env: options.env || process.env,
  });
  const result = ModuleRegistration.register(app, runtime);
  return { runtime, result };
}

function createPaymentRuntime(options = {}) {
  const resolvedConfig = RuntimeConfigResolver.resolve(process.env, options.config || {});
  const config =
    resolvedConfig instanceof RuntimeConfig ? resolvedConfig : new RuntimeConfig(resolvedConfig);

  return DependencyInjectionBootstrap.create({
    ...options,
    config,
    env: options.env || process.env,
  });
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
