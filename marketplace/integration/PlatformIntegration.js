const crypto = require("crypto");
const PlatformAuditService = require("./audit/PlatformAuditService");
const PlatformObservabilityService = require("./observability/PlatformObservabilityService");
const { PlatformFeatureFlagService, PlatformFeatureFlagStore } = require("./features/PlatformFeatureFlagService");
const OrderPricingService = require("./pricing/OrderPricingService");
const OrderPaymentBridge = require("./bridges/OrderPaymentBridge");
const OrderDeliveryBridge = require("./bridges/OrderDeliveryBridge");
const GrowthSettlementBridge = require("./bridges/GrowthSettlementBridge");
const RefundLifecycleBridge = require("./bridges/RefundLifecycleBridge");
const CorrelationContext = require("./observability/CorrelationContext");

class PlatformIntegration {
  constructor(options = {}) {
    this.useMemoryOnly = Boolean(options.useMemoryOnly);

    this.observability = options.observability || new PlatformObservabilityService();
    this.audit = options.audit || new PlatformAuditService({
      useMemoryOnly: this.useMemoryOnly,
      observability: this.observability,
    });

    const flagStore = new PlatformFeatureFlagStore({ useMemoryOnly: this.useMemoryOnly });
    this.featureFlags = options.featureFlags || new PlatformFeatureFlagService({ store: flagStore });

    this.pricing = options.pricing || new OrderPricingService({
      audit: this.audit,
      observability: this.observability,
    });

    this.paymentBridge = options.paymentBridge || new OrderPaymentBridge({
      audit: this.audit,
      observability: this.observability,
    });

    this.deliveryBridge = options.deliveryBridge || new OrderDeliveryBridge({
      audit: this.audit,
      observability: this.observability,
      featureFlags: this.featureFlags,
    });

    this.settlementBridge = options.settlementBridge || new GrowthSettlementBridge({
      paymentBridge: this.paymentBridge,
      audit: this.audit,
      observability: this.observability,
    });

    this.refundBridge = null;
    this._initialized = false;
  }

  bindOrderService(orderService) {
    if (this.orderService === orderService) return this;
    this.orderService = orderService;
    orderService.setIntegration(this);
    this.deliveryBridge.orderService = orderService;
    this.refundBridge = new RefundLifecycleBridge({
      paymentBridge: this.paymentBridge,
      audit: this.audit,
      observability: this.observability,
      orderService,
    });
    return this;
  }

  createCorrelationId(prefix = "pi") {
    return CorrelationContext.create(prefix);
  }

  async initialize() {
    if (this._initialized) return this;
    await this.featureFlags.refresh();
    this._initialized = true;
    return this;
  }

  getHealth() {
    return {
      phase: "9.2.1",
      initialized: this._initialized,
      observability: this.observability.getHealth(),
    };
  }
}

let platformIntegrationInstance = null;

function createPlatformIntegration(options = {}) {
  platformIntegrationInstance = new PlatformIntegration(options);
  return platformIntegrationInstance;
}

function getPlatformIntegration() {
  if (!platformIntegrationInstance) {
    platformIntegrationInstance = new PlatformIntegration({
      useMemoryOnly: process.env.NODE_ENV === "test" || !process.env.DB_URL,
    });
  }
  return platformIntegrationInstance;
}

module.exports = {
  PlatformIntegration,
  createPlatformIntegration,
  getPlatformIntegration,
};
