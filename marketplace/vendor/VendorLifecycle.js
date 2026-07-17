/**
 * Vendor lifecycle states derived from Shop model fields.
 */
class VendorLifecycle {
  static STATES = Object.freeze({
    PENDING_ACTIVATION: "pending_activation",
    ACTIVE: "active",
    VERIFIED: "verified",
  });

  resolveState(shop = {}) {
    if (!shop._id && !shop.id) {
      return VendorLifecycle.STATES.PENDING_ACTIVATION;
    }
    if (shop.isVerified) {
      return VendorLifecycle.STATES.VERIFIED;
    }
    return VendorLifecycle.STATES.ACTIVE;
  }

  canTransition(from, to) {
    const allowed = {
      [VendorLifecycle.STATES.PENDING_ACTIVATION]: [VendorLifecycle.STATES.ACTIVE],
      [VendorLifecycle.STATES.ACTIVE]: [VendorLifecycle.STATES.VERIFIED],
      [VendorLifecycle.STATES.VERIFIED]: [VendorLifecycle.STATES.ACTIVE],
    };
    return (allowed[from] || []).includes(to);
  }

  afterRegistration() {
    return { state: VendorLifecycle.STATES.PENDING_ACTIVATION };
  }

  afterActivation(shop) {
    return { state: this.resolveState(shop), shopId: shop._id?.toString?.() || shop.id };
  }

  afterVerification(shop, verified) {
    return {
      state: verified
        ? VendorLifecycle.STATES.VERIFIED
        : VendorLifecycle.STATES.ACTIVE,
      shopId: shop._id?.toString?.() || shop.id,
    };
  }
}

module.exports = VendorLifecycle;
