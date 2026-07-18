/**
 * Courier observability metrics.
 */
class CourierAnalytics {
  constructor({ config } = {}) {
    this.config = config;
    this.metrics = {
      registeredCouriers: 0,
      assignments: 0,
      assignmentFailures: 0,
      availabilityChanges: 0,
      capacityUtilizationSamples: [],
      completedDeliveries: 0,
    };
  }

  recordRegistered() {
    this.metrics.registeredCouriers += 1;
  }

  recordAssignment() {
    this.metrics.assignments += 1;
  }

  recordAssignmentFailure() {
    this.metrics.assignmentFailures += 1;
  }

  recordAvailabilityChange() {
    this.metrics.availabilityChanges += 1;
  }

  recordCapacityUtilization(current, maximum) {
    if (!maximum) return;
    this.metrics.capacityUtilizationSamples.push(current / maximum);
  }

  recordCompletedDelivery() {
    this.metrics.completedDeliveries += 1;
  }

  getSummary() {
    const samples = this.metrics.capacityUtilizationSamples;
    const averageCapacityUtilization = samples.length
      ? Number((samples.reduce((sum, v) => sum + v, 0) / samples.length).toFixed(2))
      : 0;

    return Object.freeze({
      registeredCouriers: this.metrics.registeredCouriers,
      assignments: this.metrics.assignments,
      assignmentFailures: this.metrics.assignmentFailures,
      availabilityChanges: this.metrics.availabilityChanges,
      averageCapacityUtilization,
      completedDeliveries: this.metrics.completedDeliveries,
      analyticsEnabled: this.config?.enableAnalytics !== false,
    });
  }

  reset() {
    this.metrics = {
      registeredCouriers: 0,
      assignments: 0,
      assignmentFailures: 0,
      availabilityChanges: 0,
      capacityUtilizationSamples: [],
      completedDeliveries: 0,
    };
  }
}

module.exports = CourierAnalytics;
