const { AGENCY_TYPES } = require("./PropertyMobilitySettingsDefaults");

class AgencyService {
  constructor({ repository, configStore, audit }) {
    this.repository = repository;
    this.configStore = configStore;
    this.audit = audit;
  }

  async createAgency(ownerId, payload = {}, meta = {}) {
    if (!AGENCY_TYPES.includes(payload.type)) {
      const error = new Error(`Invalid agency type: ${payload.type}`);
      error.statusCode = 400;
      throw error;
    }

    const agency = await this.repository.createAgency(ownerId, payload);
    await this.audit.record({
      platform: "propertyMobility",
      resource: agency.agencyId,
      action: "agency.created",
      actor: meta.actor || ownerId,
      newValue: agency,
    });
    return agency;
  }

  async subscribeAgency(ownerId, agencyId, meta = {}) {
    const toggles = this.configStore.getFeatureToggles();
    if (toggles.agencies === false) {
      const error = new Error("Agency accounts are disabled");
      error.statusCode = 403;
      error.reason = "FEATURE_DISABLED";
      throw error;
    }

    const agency = await this.repository.getAgency(agencyId);
    if (!agency || agency.ownerId !== String(ownerId)) {
      const error = new Error("Agency not found");
      error.statusCode = 404;
      throw error;
    }

    const pricing = this.configStore.getPricing();
    const limits = this.configStore.getAgencyLimits();
    const durationDays = Number(pricing.agencySubscriptionDurationDays) || 30;
    const expiresAt = new Date(Date.now() + durationDays * 86_400_000).toISOString();
    const updated = await this.repository.updateAgency(agencyId, {
      subscriptionStatus: "active",
      subscriptionExpiresAt: expiresAt,
      unlimitedListings: limits.unlimitedListings,
      maxListings: limits.unlimitedListings ? null : limits.maxListings,
    });

    await this.audit.record({
      platform: "propertyMobility",
      resource: agencyId,
      action: "agency.subscribed",
      actor: meta.actor || ownerId,
      newValue: {
        price: pricing.agencySubscriptionPrice,
        durationDays,
        expiresAt,
        unlimitedListings: limits.unlimitedListings,
        maxListings: limits.unlimitedListings ? null : limits.maxListings,
      },
    });

    return updated;
  }

  async listAgencies(ownerId) {
    return this.repository.listAgencies(ownerId);
  }

  async getAgency(ownerId, agencyId) {
    const agency = await this.repository.getAgency(agencyId);
    if (!agency || agency.ownerId !== String(ownerId)) return null;
    return agency;
  }

  async getActiveAgencySubscription(ownerId) {
    const agencies = await this.repository.listAgencies(ownerId);
    const now = Date.now();
    return (
      agencies.find(
        (agency) =>
          agency.subscriptionStatus === "active" &&
          agency.subscriptionExpiresAt &&
          new Date(agency.subscriptionExpiresAt).getTime() > now
      ) || null
    );
  }
}

module.exports = AgencyService;
