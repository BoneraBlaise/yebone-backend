class PropertyMobilityHealth {
  static check(platform) {
    return Object.freeze({
      status: "ok",
      module: "property-mobility",
      initialized: Boolean(platform?.initialized),
      useMemoryOnly: Boolean(platform?.useMemoryOnly),
      services: {
        listings: Boolean(platform?.listingService),
        search: Boolean(platform?.searchBridge),
        promotions: Boolean(platform?.promotionService),
        verification: Boolean(platform?.verificationService),
        agencies: Boolean(platform?.agencyService),
        offers: Boolean(platform?.offerService),
        reports: Boolean(platform?.reportService),
        moderation: Boolean(platform?.moderationService),
      },
    });
  }
}

module.exports = PropertyMobilityHealth;
