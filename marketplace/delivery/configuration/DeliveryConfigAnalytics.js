class DeliveryConfigAnalytics {
  constructor() {
    this.metrics = {
      configurationChanges: 0,
      featureUsage: {},
      disabledFeatureAttempts: 0,
      rejectedCourierAssignments: 0,
      rejectedDeliveryRequests: 0,
    };
  }

  recordConfigurationChange() {
    this.metrics.configurationChanges += 1;
  }

  recordFeatureUsage(feature) {
    if (!feature) return;
    this.metrics.featureUsage[feature] = (this.metrics.featureUsage[feature] || 0) + 1;
  }

  recordDisabledFeatureAttempt() {
    this.metrics.disabledFeatureAttempts += 1;
  }

  recordRejectedCourierAssignment() {
    this.metrics.rejectedCourierAssignments += 1;
  }

  recordRejectedDeliveryRequest() {
    this.metrics.rejectedDeliveryRequests += 1;
  }

  getSummary() {
    return Object.freeze({
      configurationChanges: this.metrics.configurationChanges,
      featureUsage: { ...this.metrics.featureUsage },
      disabledFeatureAttempts: this.metrics.disabledFeatureAttempts,
      rejectedCourierAssignments: this.metrics.rejectedCourierAssignments,
      rejectedDeliveryRequests: this.metrics.rejectedDeliveryRequests,
    });
  }
}

module.exports = DeliveryConfigAnalytics;
