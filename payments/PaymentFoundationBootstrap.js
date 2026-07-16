const createProviderFoundation = require("./infrastructure/providers/ProviderAdapterFactory");
const { createRuntimeFoundation } = require("./infrastructure/providers/runtime/RuntimeBootstrap");
const createPaymentEngineBootstrap = require("./infrastructure/engine/PaymentEngineBootstrap");
const PaymentModuleWebhookService = require("./PaymentModuleWebhookService");
const RuntimeConfig = require("./infrastructure/providers/runtime/RuntimeConfig");

/**
 * Payment Foundation composition root — wires Module 4 engine + Module 9 providers + Module 10 runtime.
 * RuntimeFactory remains the runtime composition root; this bootstrap coordinates cross-module DI only.
 * Not auto-invoked by PaymentModule — optional injection preserves backward compatibility.
 */
function createPaymentFoundation(options = {}) {
  const providerFoundation = createProviderFoundation(options.providerOptions);

  const runtimeFoundation = createRuntimeFoundation({
    ...options.runtimeOptions,
    providerRegistry: providerFoundation.providerRegistry,
    skeletonAdapterRegistry: providerFoundation.adapterRegistry,
    featureFlags: providerFoundation.featureFlags,
    providerAdapterResolver: providerFoundation.adapterResolver,
    providerCapabilityValidator: providerFoundation.capabilityValidator,
  });

  const engineBootstrap = createPaymentEngineBootstrap({
    ...options.engineOptions,
    featureFlags: providerFoundation.featureFlags,
    providerRegistry: providerFoundation.providerRegistry,
    providerResolver: providerFoundation.providerResolver,
    providerExecutionOrchestrator: runtimeFoundation.providerExecutionOrchestrator,
  });

  const webhookService = new PaymentModuleWebhookService({
    runtimeAdapterResolver: runtimeFoundation.runtimeAdapterResolver,
    runtimeExecutionGuard: runtimeFoundation.runtimeExecutionGuard,
  });

  return Object.freeze({
    version: RuntimeConfig.version,
    providerFoundation,
    runtimeFoundation,
    engineBootstrap,
    engine: engineBootstrap.engine,
    providerExecutionOrchestrator: runtimeFoundation.providerExecutionOrchestrator,
    featureFlags: providerFoundation.featureFlags,
    runtimeFeatureFlags: runtimeFoundation.runtimeFeatureFlags,
    runtimeAdapterResolver: runtimeFoundation.runtimeAdapterResolver,
    runtimeExecutionGuard: runtimeFoundation.runtimeExecutionGuard,
    webhookService,
  });
}

module.exports = { createPaymentFoundation };
