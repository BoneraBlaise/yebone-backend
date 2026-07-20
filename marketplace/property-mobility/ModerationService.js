class ModerationService {
  constructor({ repository, audit, promotionBridge }) {
    this.repository = repository;
    this.audit = audit;
    this.promotionBridge = promotionBridge;
  }

  async moderateListing(adminId, listingId, action, meta = {}) {
    const listing = await this.repository.getListing(listingId);
    if (!listing) {
      const error = new Error("Listing not found");
      error.statusCode = 404;
      throw error;
    }

    const actionMap = {
      approve: { status: "published" },
      reject: { status: "rejected" },
      suspend: { status: "suspended" },
      remove: { status: "deleted" },
      verify: { verified: true },
      feature: { featured: true },
    };

    const patch = actionMap[action];
    if (!patch) {
      const error = new Error(`Invalid moderation action: ${action}`);
      error.statusCode = 400;
      throw error;
    }

    const updated = await this.repository.updateListing(listingId, patch);

    if (action === "feature" && this.promotionBridge) {
      await this.promotionBridge.applyPromotion(listing.ownerId, listingId, "featured", {
        actor: adminId,
      }).catch(() => {});
    }

    await this.audit.record({
      platform: "propertyMobility",
      resource: listingId,
      action: `moderation.listing.${action}`,
      actor: meta.actor || adminId,
      newValue: updated,
    });

    return updated;
  }

  async verifyOwner(adminId, ownerId, payload = {}, meta = {}) {
    await this.audit.record({
      platform: "propertyMobility",
      resource: ownerId,
      action: "moderation.owner.verified",
      actor: meta.actor || adminId,
      newValue: payload,
    });
    return { ownerId, verified: true, ...payload };
  }

  async moderateReport(adminId, reportId, status, adminNotes = "", meta = {}) {
    const updated = await this.repository.updateReport(reportId, { status, adminNotes });
    if (!updated) {
      const error = new Error("Report not found");
      error.statusCode = 404;
      throw error;
    }

    if (status === "action_taken" && updated.listingId) {
      await this.repository.updateListing(updated.listingId, { status: "suspended" });
    }

    await this.audit.record({
      platform: "propertyMobility",
      resource: reportId,
      action: "moderation.report.updated",
      actor: meta.actor || adminId,
      newValue: updated,
    });

    return updated;
  }

  async getAdminDashboard() {
    const listings = await this.repository.listListings({});
    const reports = await this.repository.listReports({ status: "pending" });
    const agencies = await this.repository.listAgencies();

    return {
      listings: {
        total: listings.length,
        pendingReview: listings.filter((l) => l.status === "pending_review").length,
        published: listings.filter((l) => l.status === "published").length,
        suspended: listings.filter((l) => l.status === "suspended").length,
      },
      reports: { pending: reports.length },
      agencies: { total: agencies.length, activeSubscriptions: agencies.filter((a) => a.subscriptionStatus === "active").length },
    };
  }
}

module.exports = ModerationService;
