const { getPlatformFeatureFlags } = require("../../integration/features/PlatformFeatureFlagResolver");

const DELIVERY_FLAG_MAP = Object.freeze({
  vendorDelivery: "vendorDelivery.enabled",
  customerPickup: "customerPickup.enabled",
  yeboneDelivery: "yeboneDelivery.enabled",
  liveTracking: "liveTracking.enabled",
  eta: "eta.enabled",
  courierPhoneVisibility: "courierPhoneVisibility.enabled",
  customerPhoneVisibility: "customerPhoneVisibility.enabled",
  manualAssignment: "manualAssignment.enabled",
  autoAssignment: "autoAssignment.enabled",
  deliveryRatings: "deliveryRatings.enabled",
});

class FeatureFlagService {
  constructor(store) {
    if (!store) throw new Error("FeatureFlagService requires DeliveryConfigStore");
    this.store = store;
  }

  _usePlatformAuthority() {
    return Boolean(getPlatformFeatureFlags()) && !this.store.useMemoryOnly;
  }

  _flag(key) {
    const platformKey = DELIVERY_FLAG_MAP[key];
    if (this._usePlatformAuthority() && platformKey) {
      return getPlatformFeatureFlags().isEnabledSync("delivery", platformKey);
    }
    return Boolean(this.store.getSettings()?.[key]?.enabled);
  }

  isVendorDeliveryEnabled() {
    return this._flag("vendorDelivery");
  }

  isCustomerPickupEnabled() {
    return this._flag("customerPickup");
  }

  isYeboneDeliveryEnabled() {
    return this._flag("yeboneDelivery");
  }

  isLiveTrackingEnabled() {
    return this._flag("liveTracking");
  }

  isETAEnabled() {
    return this._flag("eta");
  }

  isCourierPhoneVisibilityEnabled() {
    return this._flag("courierPhoneVisibility");
  }

  isCustomerPhoneVisibilityEnabled() {
    return this._flag("customerPhoneVisibility");
  }

  isManualAssignmentEnabled() {
    return this._flag("manualAssignment");
  }

  isAutoAssignmentEnabled() {
    return this._flag("autoAssignment");
  }

  isDeliveryRatingsEnabled() {
    return this._flag("deliveryRatings");
  }

  getPublicFeatures() {
    return {
      vendorDelivery: this.isVendorDeliveryEnabled(),
      customerPickup: this.isCustomerPickupEnabled(),
      yeboneDelivery: this.isYeboneDeliveryEnabled(),
      liveTracking: this.isLiveTrackingEnabled(),
      eta: this.isETAEnabled(),
      courierPhoneVisibility: this.isCourierPhoneVisibilityEnabled(),
      customerPhoneVisibility: this.isCustomerPhoneVisibilityEnabled(),
      manualAssignment: this.isManualAssignmentEnabled(),
      autoAssignment: this.isAutoAssignmentEnabled(),
      deliveryRatings: this.isDeliveryRatingsEnabled(),
    };
  }
}

module.exports = FeatureFlagService;
