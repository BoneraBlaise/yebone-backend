const { NOTIFICATION_TYPES } = require("../communication/CommunicationDefaults");

class ModerationService {
  constructor({ repository, audit, promotionBridge, notificationService = null }) {
    this.repository = repository;
    this.audit = audit;
    this.promotionBridge = promotionBridge;
    this.notificationService = notificationService;
  }

  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  resolveRestoreStatus(listing) {
    if (listing.status === "needs_changes" || listing.status === "rejected") {
      return "pending_review";
    }
    if (listing.status === "deleted") {
      return "draft";
    }
    return "published";
  }

  async notifyOwner(listing, action, meta = {}) {
    if (!this.notificationService || !listing?.ownerId) return;

    const listingTitle = listing.title || "Your listing";
    const link = "/dashboard-property-mobility";
    const notes = meta.adminNotes ? ` Note: ${meta.adminNotes}` : "";

    const notificationMap = {
      approve: {
        type: NOTIFICATION_TYPES.LISTING_APPROVED,
        title: "Listing approved",
        message: `"${listingTitle}" is now live on Yebone.${notes}`,
      },
      reject: {
        type: NOTIFICATION_TYPES.LISTING_REJECTED,
        title: "Listing rejected",
        message: `"${listingTitle}" was rejected.${notes}`,
      },
      request_changes: {
        type: NOTIFICATION_TYPES.LISTING_NEEDS_CHANGES,
        title: "Changes requested",
        message: `"${listingTitle}" needs updates before it can go live.${notes}`,
      },
      needs_changes: {
        type: NOTIFICATION_TYPES.LISTING_NEEDS_CHANGES,
        title: "Changes requested",
        message: `"${listingTitle}" needs updates before it can go live.${notes}`,
      },
      suspend: {
        type: NOTIFICATION_TYPES.LISTING_SUSPENDED,
        title: "Listing suspended",
        message: `"${listingTitle}" has been suspended.${notes}`,
      },
      hide: {
        type: NOTIFICATION_TYPES.LISTING_SUSPENDED,
        title: "Listing hidden",
        message: `"${listingTitle}" has been hidden from public view.${notes}`,
      },
      restore: {
        type: NOTIFICATION_TYPES.LISTING_RESTORED,
        title: "Listing restored",
        message: `"${listingTitle}" has been restored.${notes}`,
      },
      feature: {
        type: NOTIFICATION_TYPES.LISTING_FEATURED,
        title: "Listing featured",
        message: `"${listingTitle}" is now featured on Yebone.${notes}`,
      },
    };

    const payload = notificationMap[action];
    if (!payload) return;

    await this.notificationService.notifyUser(String(listing.ownerId), {
      ...payload,
      link,
      metadata: { listingId: listing.listingId, action },
    }).catch(() => {});
  }

  async moderateListing(adminId, listingId, action, meta = {}) {
    const listing = await this.repository.getListing(listingId);
    if (!listing) {
      const error = new Error("Listing not found");
      error.statusCode = 404;
      throw error;
    }

    if (action === "restore") {
      const status = this.resolveRestoreStatus(listing);
      const patch = { status };
      if (meta.adminNotes) patch.adminNotes = meta.adminNotes;
      const updated = await this.repository.updateListing(listingId, patch);
      await this.audit.record({
        platform: "propertyMobility",
        resource: listingId,
        action: "moderation.listing.restore",
        actor: meta.actor || adminId,
        newValue: updated,
      });
      await this.notifyOwner(listing, "restore", meta);
      return updated;
    }

    const actionMap = {
      approve: { status: "published" },
      reject: { status: "rejected" },
      request_changes: { status: "needs_changes" },
      needs_changes: { status: "needs_changes" },
      suspend: { status: "suspended" },
      hide: { status: "paused" },
      remove: { status: "deleted" },
      verify: { verified: true },
      feature: { featured: true },
      unfeature: { featured: false },
    };

    const patch = { ...actionMap[action] };
    if (!patch || Object.keys(patch).length === 0) {
      const error = new Error(`Invalid moderation action: ${action}`);
      error.statusCode = 400;
      throw error;
    }

    if (meta.adminNotes) {
      patch.adminNotes = meta.adminNotes;
    }

    const updated = await this.repository.updateListing(listingId, patch);

    if (action === "feature" && this.promotionBridge) {
      await this.promotionBridge
        .applyPromotion(listing.ownerId, listingId, "featured", { actor: adminId })
        .catch(() => {});
    }

    await this.audit.record({
      platform: "propertyMobility",
      resource: listingId,
      action: `moderation.listing.${action}`,
      actor: meta.actor || adminId,
      newValue: updated,
    });

    await this.notifyOwner(listing, action, meta);

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
        needsChanges: listings.filter((l) => l.status === "needs_changes").length,
        published: listings.filter((l) => l.status === "published").length,
        suspended: listings.filter((l) => l.status === "suspended").length,
      },
      reports: { pending: reports.length },
      agencies: {
        total: agencies.length,
        activeSubscriptions: agencies.filter((a) => a.subscriptionStatus === "active").length,
      },
    };
  }
}

module.exports = ModerationService;
