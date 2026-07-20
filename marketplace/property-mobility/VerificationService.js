class VerificationService {
  constructor({ repository, configStore, audit }) {
    this.repository = repository;
    this.configStore = configStore;
    this.audit = audit;
  }

  async requestVerification(ownerId, payload = {}, meta = {}) {
    const toggles = this.configStore.getFeatureToggles();
    if (toggles.verification === false) {
      const error = new Error("Verification is disabled");
      error.statusCode = 403;
      throw error;
    }

    const pricing = this.configStore.getPricing();
    const durationMs = Number(pricing.verificationDurationDays || 60) * 86_400_000;
    const expiresAt = new Date(Date.now() + durationMs).toISOString();

    const record = await this.repository.createVerification(ownerId, {
      nationalIdVerified: Boolean(payload.nationalIdVerified),
      phoneVerified: Boolean(payload.phoneVerified),
      businessVerified: Boolean(payload.businessVerified),
      addressVerified: Boolean(payload.addressVerified),
      feeAmount: Number(pricing.verifiedBadgePrice || 10000),
      expiresAt,
      status: "active",
    });

    if (payload.listingId) {
      await this.repository.updateListing(payload.listingId, { verified: true });
    }

    await this.audit.record({
      platform: "propertyMobility",
      resource: record.verificationId,
      action: "verification.granted",
      actor: meta.actor || ownerId,
      newValue: record,
    });

    return { ...record, badge: "Yebone Verified" };
  }

  async getVerificationStatus(ownerId) {
    const active = await this.repository.getActiveVerification(ownerId);
    return {
      verified: Boolean(active),
      badge: active ? "Yebone Verified" : null,
      expiresAt: active?.expiresAt || null,
      requirements: {
        nationalId: Boolean(active?.nationalIdVerified),
        phone: Boolean(active?.phoneVerified),
        business: Boolean(active?.businessVerified),
        address: Boolean(active?.addressVerified),
      },
    };
  }
}

module.exports = VerificationService;
