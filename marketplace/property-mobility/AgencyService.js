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
    const agency = await this.repository.getAgency(agencyId);
    if (!agency || agency.ownerId !== String(ownerId)) {
      const error = new Error("Agency not found");
      error.statusCode = 404;
      throw error;
    }

    const pricing = this.configStore.getPricing();
    const expiresAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const updated = await this.repository.updateAgency(agencyId, {
      subscriptionStatus: "active",
      subscriptionExpiresAt: expiresAt,
      unlimitedListings: true,
    });

    await this.audit.record({
      platform: "propertyMobility",
      resource: agencyId,
      action: "agency.subscribed",
      actor: meta.actor || ownerId,
      newValue: { price: pricing.agencySubscriptionPrice, expiresAt },
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
}

module.exports = AgencyService;
