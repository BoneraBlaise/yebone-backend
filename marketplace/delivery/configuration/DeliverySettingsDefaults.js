/**
 * Default delivery configuration values (Phase 8.3).
 */
const DeliverySettingsDefaults = Object.freeze({
  vendorDelivery: { enabled: true },
  customerPickup: { enabled: true },
  yeboneDelivery: { enabled: false },
  liveTracking: { enabled: false },
  eta: { enabled: false },
  courierPhoneVisibility: { enabled: false },
  customerPhoneVisibility: { enabled: false },
  manualAssignment: { enabled: true },
  autoAssignment: { enabled: false },
  deliveryRatings: { enabled: false },
});

module.exports = DeliverySettingsDefaults;
