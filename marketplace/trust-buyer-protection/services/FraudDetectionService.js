const { FRAUD_RISK_LEVELS } = require("../TrustBuyerProtectionSettingsDefaults");

class FraudDetectionService {
  constructor({ repository, audit }) {
    this.repository = repository;
    this.audit = audit;
  }

  _resolveRiskLevel(signals = []) {
    const score = signals.reduce((sum, s) => sum + Number(s.weight || 1), 0);
    if (score >= 8) return "CRITICAL";
    if (score >= 5) return "HIGH";
    if (score >= 3) return "MEDIUM";
    return "LOW";
  }

  async analyzeSubject(subjectId, signals = [], meta = {}) {
    const riskLevel = this._resolveRiskLevel(signals);
    if (!FRAUD_RISK_LEVELS.includes(riskLevel)) {
      const error = new Error("Invalid risk level");
      error.statusCode = 500;
      throw error;
    }

    const alert =
      riskLevel === "LOW"
        ? null
        : await this.repository.createFraudAlert({
            subjectId: String(subjectId),
            subjectType: meta.subjectType || "customer",
            riskLevel,
            signals,
            status: "open",
          });

    if (alert && this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: alert.alertId,
        action: "fraud.alert_created",
        actor: meta.actor || "system",
        newValue: alert,
      });
    }

    return {
      subjectId: String(subjectId),
      riskLevel,
      signals,
      alert,
      requiresAdminReview: riskLevel !== "LOW",
    };
  }

  detectFromMetrics(metrics = {}) {
    const signals = [];

    if (Number(metrics.fakeAccountCount || 0) > 2) {
      signals.push({ type: "multiple_fake_accounts", weight: 3, detail: metrics.fakeAccountCount });
    }
    if (Number(metrics.failedPaymentCount || 0) > 3) {
      signals.push({ type: "repeated_failed_payments", weight: 2, detail: metrics.failedPaymentCount });
    }
    if (Number(metrics.disputeRate || 0) > 0.2) {
      signals.push({ type: "high_dispute_frequency", weight: 3, detail: metrics.disputeRate });
    }
    if (Number(metrics.ordersPerHour || 0) > 10) {
      signals.push({ type: "suspicious_order_velocity", weight: 2, detail: metrics.ordersPerHour });
    }
    if (metrics.verificationMismatch) {
      signals.push({ type: "verification_mismatch", weight: 4, detail: true });
    }
    if (metrics.locationAnomaly) {
      signals.push({ type: "location_anomaly", weight: 2, detail: metrics.locationAnomaly });
    }

    return signals;
  }

  async runDetection(subjectId, metrics = {}, meta = {}) {
    const signals = this.detectFromMetrics(metrics);
    return this.analyzeSubject(subjectId, signals, meta);
  }

  async listAlerts(filters = {}) {
    return this.repository.listFraudAlerts(filters);
  }

  async reviewAlert(alertId, status, meta = {}) {
    const updated = await this.repository.updateFraudAlert(alertId, {
      status,
      reviewedBy: meta.actor || "admin",
    });

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: alertId,
        action: "fraud.alert_reviewed",
        actor: meta.actor || "admin",
        newValue: updated,
      });
    }

    return updated;
  }
}

module.exports = FraudDetectionService;
