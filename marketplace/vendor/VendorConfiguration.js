/**
 * Vendor platform configuration — frozen after vendor-management-v1.
 */
class VendorConfiguration {
  constructor(options = {}) {
    this.name = options.name || "Yebone Vendor Platform";
    this.version = options.version || "1.0.0";
    this.minWithdrawAmount = Number(options.minWithdrawAmount || 50);
    this.activationUrlBase =
      options.activationUrlBase ||
      process.env.FRONTEND_URL ||
      "https://guriraline.com";
    this.requireVerificationForWithdraw =
      options.requireVerificationForWithdraw !== false;
    this.enableAnalytics = options.enableAnalytics !== false;
  }

  buildActivationUrl(token) {
    const base = String(this.activationUrlBase).replace(/\/$/, "");
    return `${base}/seller/activation/${token}`;
  }
}

module.exports = VendorConfiguration;
