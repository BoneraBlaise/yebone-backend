const { REPORT_REASONS } = require("./PropertyMobilitySettingsDefaults");

class ReportService {
  constructor({ repository, audit }) {
    this.repository = repository;
    this.audit = audit;
  }

  async submitReport(reporterId, payload = {}, meta = {}) {
    if (!REPORT_REASONS.includes(payload.reason)) {
      const error = new Error(`Invalid report reason: ${payload.reason}`);
      error.statusCode = 400;
      throw error;
    }

    const listing = await this.repository.getListing(payload.listingId);
    if (!listing) {
      const error = new Error("Listing not found");
      error.statusCode = 404;
      throw error;
    }

    const report = await this.repository.createReport({
      listingId: payload.listingId,
      reporterId,
      reason: payload.reason,
      details: payload.details,
      status: "pending",
    });

    await this.audit.record({
      platform: "propertyMobility",
      resource: report.reportId,
      action: "report.submitted",
      actor: meta.actor || reporterId,
      newValue: report,
    });

    return report;
  }

  async listReports(filters = {}) {
    return this.repository.listReports(filters);
  }
}

module.exports = ReportService;
