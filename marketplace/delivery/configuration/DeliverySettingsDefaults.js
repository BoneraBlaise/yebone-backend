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
  pricing: {
    baseFee: 2000,
    perKm: 500,
    heavyPackage: 1500,
    nightFee: 1000,
    expressFee: 2500,
    largePackage: 2000,
  },
  zones: {
    supportedDistricts: ["Kigali", "Gasabo", "Kicukiro", "Nyarugenge"],
    coverageNote: "Yebone Delivery network — activate when ready",
  },
  partners: {
    courierPartners: [],
    futureRiders: true,
  },
});

module.exports = DeliverySettingsDefaults;
