const MarketplaceConfig = require("./MarketplaceConfig");
const MarketplaceFeatureRegistry = require("./MarketplaceFeatureRegistry");
const MarketplacePermissions = require("./MarketplacePermissions");
const MarketplaceLifecycle = require("./MarketplaceLifecycle");
const MarketplaceHealth = require("./MarketplaceHealth");
const OrderService = require("../services/OrderService");
const ProductService = require("../services/ProductService");
const ShopService = require("../services/ShopService");
const CommissionService = require("../services/CommissionService");
const UploadService = require("../services/UploadService");
const PaymentIntegrationHook = require("../hooks/PaymentIntegrationHook");
const OrderLifecycleHook = require("../hooks/OrderLifecycleHook");
const CommissionHook = require("../hooks/CommissionHook");
const AiHookRegistry = require("../hooks/AiHookRegistry");

class MarketplaceCore {
  constructor(options = {}) {
    this.config = new MarketplaceConfig(options.config || {});
    this.features = new MarketplaceFeatureRegistry();
    this.permissions = MarketplacePermissions;
    this.lifecycle = new MarketplaceLifecycle();

    this.services = {
      order: new OrderService(),
      product: new ProductService({ uploadService: new UploadService() }),
      shop: new ShopService(),
      commission: new CommissionService(),
      upload: new UploadService(),
    };

    this.hooks = {
      payment: new PaymentIntegrationHook({ enabled: this.config.enablePaymentHooks }),
      order: new OrderLifecycleHook(),
      commission: new CommissionHook(),
      ai: new AiHookRegistry(),
    };

    this.health = new MarketplaceHealth(this);
  }
}

module.exports = MarketplaceCore;
