class FeatureFlagService {
  constructor(store) {
    if (!store) throw new Error("FeatureFlagService requires DeliveryConfigStore");
    this.store = store;
  }

  _flag(key) {
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
