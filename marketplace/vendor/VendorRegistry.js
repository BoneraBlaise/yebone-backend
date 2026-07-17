/**
 * Vendor feature registry — tracks enabled vendor capabilities.
 */
class VendorRegistry {
  constructor() {
    this.features = new Map([
      ["registration", true],
      ["onboarding", true],
      ["profile", true],
      ["verification", true],
      ["settings", true],
      ["withdraw_methods", true],
      ["analytics", true],
      ["branding", true],
    ]);
  }

  isEnabled(feature) {
    return this.features.get(feature) === true;
  }

  listEnabled() {
    return [...this.features.entries()]
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
  }
}

module.exports = VendorRegistry;
