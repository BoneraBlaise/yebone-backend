class DeliveryOperationGuard {
  constructor({ featureFlags, analytics } = {}) {
    this.featureFlags = featureFlags;
    this.analytics = analytics;
  }

  _featureDisabledResponse(feature, message) {
    if (this.analytics) this.analytics.recordDisabledFeatureAttempt();
    const error = new Error(message);
    error.statusCode = 403;
    error.reason = "FEATURE_DISABLED";
    error.feature = feature;
    return error;
  }

  assertYeboneDeliveryEnabled() {
    if (!this.featureFlags.isYeboneDeliveryEnabled()) {
      if (this.analytics) this.analytics.recordRejectedDeliveryRequest();
      throw this._featureDisabledResponse("yeboneDelivery", "Yebone Delivery is currently disabled");
    }
  }

  assertManualAssignmentEnabled() {
    if (!this.featureFlags.isManualAssignmentEnabled()) {
      if (this.analytics) this.analytics.recordRejectedCourierAssignment();
      throw this._featureDisabledResponse(
        "manualAssignment",
        "Manual courier assignment is currently disabled"
      );
    }
  }

  assertAutoAssignmentEnabled() {
    if (!this.featureFlags.isAutoAssignmentEnabled()) {
      throw this._featureDisabledResponse("autoAssignment", "Auto assignment is currently disabled");
    }
  }
}

module.exports = DeliveryOperationGuard;
