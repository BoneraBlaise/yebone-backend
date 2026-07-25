class TrustBuyerProtectionHealth {
  static check(platform) {
    const settings = platform.configStore.getSettings();
    return {
      healthy: true,
      phase: "14.0",
      domain: "trust-buyer-protection",
      enabled: settings.enabled !== false,
      services: {
        buyerProtection: Boolean(platform.buyerProtectionService),
        disputes: Boolean(platform.disputeService),
        escrow: Boolean(platform.escrowService),
        verification: Boolean(platform.verificationService),
        trustScore: Boolean(platform.trustScoreService),
        fraud: Boolean(platform.fraudDetectionService),
        policies: Boolean(platform.policyService),
        analytics: Boolean(platform.analyticsService),
      },
      initialized: platform.initialized,
      checkedAt: new Date().toISOString(),
    };
  }
}

module.exports = TrustBuyerProtectionHealth;
