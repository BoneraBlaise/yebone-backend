const ProviderAdapterConfig = require("./ProviderAdapterConfig");
const ProviderAdapterInterface = require("./ProviderAdapterInterface");
const MTNMoMoAdapter = require("./adapters/MTNMoMoAdapter");
const AirtelMoneyAdapter = require("./adapters/AirtelMoneyAdapter");
const FlutterwaveAdapter = require("./adapters/FlutterwaveAdapter");
const StripeAdapter = require("./adapters/StripeAdapter");
const PaypackAdapter = require("./adapters/PaypackAdapter");
const WebhookVerificationInterface = require("./WebhookVerificationInterface");
const ProviderReferenceInterface = require("./ProviderReferenceInterface");

const ADAPTER_FACTORIES = Object.freeze({
  MTN_MOMO: MTNMoMoAdapter,
  AIRTEL_MONEY: AirtelMoneyAdapter,
  FLUTTERWAVE: FlutterwaveAdapter,
  STRIPE: StripeAdapter,
  PAYPACK: PaypackAdapter,
});

/**
 * Registers skeleton adapters onto the Module 4 ProviderRegistry.
 */
class ProviderAdapterRegistry {
  constructor({ registry, featureGate, capabilityValidator, featureFlags }) {
    if (!registry) {
      throw new Error("ProviderAdapterRegistry requires registry");
    }
    this.registry = registry;
    this.featureGate = featureGate;
    this.capabilityValidator = capabilityValidator;
    this.featureFlags = featureFlags;
  }

  registerAdapter(providerCode, AdapterClass, descriptorOverrides = {}) {
    const code = this._normalizeCode(providerCode);
    const adapter = new AdapterClass({
      providerCode: code,
      featureGate: this.featureGate,
      capabilityValidator: this.capabilityValidator,
      registry: this.registry,
      featureFlags: this.featureFlags,
    });

    ProviderAdapterInterface.assertImplementation(adapter, code);
    WebhookVerificationInterface.assertImplementation(adapter, code);
    ProviderReferenceInterface.assertImplementation(adapter, code);

    const existing = this.registry.has(code) ? this.registry.resolve(code) : null;
    const descriptor = {
      code,
      ...(existing || {}),
      ...descriptorOverrides,
      enabled: descriptorOverrides.enabled === true,
      adapter,
    };

    this.registry.register(descriptor);
    return adapter;
  }

  registerDefaultAdapters() {
    if (this.registry.list().length === 0) {
      this.registry.registerDefaults();
    }

    const adapters = {};
    for (const code of ProviderAdapterConfig.supportedProviderCodes) {
      const AdapterClass = ADAPTER_FACTORIES[code];
      if (!AdapterClass) {
        continue;
      }
      adapters[code] = this.registerAdapter(code, AdapterClass);
    }

    return Object.freeze(adapters);
  }

  getAdapter(providerCode) {
    const entry = this.registry.resolve(this._normalizeCode(providerCode));
    return entry.adapter || null;
  }

  _normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }
}

module.exports = ProviderAdapterRegistry;
