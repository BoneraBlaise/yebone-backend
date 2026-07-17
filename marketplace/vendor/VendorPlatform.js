const VendorConfiguration = require("./VendorConfiguration");
const VendorRegistry = require("./VendorRegistry");
const VendorPermissions = require("./VendorPermissions");
const VendorLifecycle = require("./VendorLifecycle");
const VendorProfile = require("./VendorProfile");
const VendorVerification = require("./VendorVerification");
const VendorAnalytics = require("./VendorAnalytics");
const VendorSettings = require("./VendorSettings");
const VendorHealth = require("./VendorHealth");
const VendorHooks = require("./VendorHooks");

/**
 * Vendor Platform composition root — integrates with Marketplace Core services.
 */
class VendorPlatform {
  constructor({ marketplaceCore, config } = {}) {
    if (!marketplaceCore) {
      throw new Error("VendorPlatform requires marketplaceCore");
    }

    this.marketplaceCore = marketplaceCore;
    this.config = new VendorConfiguration(config);
    this.registry = new VendorRegistry();
    this.permissions = VendorPermissions;
    this.lifecycle = new VendorLifecycle();

    this.shopService = marketplaceCore.services.shop;

    this.profile = new VendorProfile({ shopService: this.shopService });
    this.verification = new VendorVerification({
      shopService: this.shopService,
      lifecycle: this.lifecycle,
    });
    this.settings = new VendorSettings({ shopService: this.shopService });
    this.analytics = new VendorAnalytics({
      lifecycle: this.lifecycle,
      config: this.config,
    });
    this.hooks = new VendorHooks({ lifecycle: this.lifecycle });
    this.health = new VendorHealth(this);
  }

  async registerPending(input) {
    const result = await this.shopService.registerPending(input);
    this.hooks.afterRegistrationPending(result);
    return result;
  }

  async activateFromToken(token) {
    const seller = await this.shopService.activateFromToken(token);
    this.hooks.afterActivated({ shop: seller });
    return seller;
  }

  async login(email, password) {
    return this.shopService.login(email, password);
  }
}

module.exports = VendorPlatform;
