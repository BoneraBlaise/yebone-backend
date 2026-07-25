const { VERIFICATION_TYPES, VERIFICATION_STATUSES } = require("../TrustBuyerProtectionSettingsDefaults");

class VerificationService {
  constructor({ repository, configStore, policyService, audit }) {
    this.repository = repository;
    this.configStore = configStore;
    this.policyService = policyService;
    this.audit = audit;
  }

  _assertType(type) {
    if (!VERIFICATION_TYPES.includes(type)) {
      const error = new Error(`Invalid verification type: ${type}`);
      error.statusCode = 400;
      throw error;
    }
  }

  async submitVerification(subjectId, payload = {}, meta = {}) {
    const settings = this.configStore.getSettings();
    if (settings.verification?.enabled === false) {
      const error = new Error("Verification is disabled");
      error.statusCode = 403;
      throw error;
    }

    this._assertType(payload.type);
    const record = await this.repository.createVerification(subjectId, {
      subjectType: payload.subjectType || "customer",
      type: payload.type,
      status: "Submitted",
      evidence: payload.evidence || {},
    });

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: record.verificationId,
        action: "verification.submitted",
        actor: meta.actor || subjectId,
        newValue: record,
      });
    }

    return record;
  }

  async reviewVerification(verificationId, decision, meta = {}) {
    const record = await this.repository.getVerification(verificationId);
    if (!record) {
      const error = new Error("Verification not found");
      error.statusCode = 404;
      throw error;
    }

    const status = decision === "approve" ? "Verified" : "Rejected";
    if (!VERIFICATION_STATUSES.includes(status)) {
      const error = new Error("Invalid verification decision");
      error.statusCode = 400;
      throw error;
    }

    const policies = this.policyService.getPolicies();
    const durationMs = Number(policies.protectionDurationDays || 60) * 86_400_000;
    const expiresAt =
      status === "Verified" ? new Date(Date.now() + durationMs).toISOString() : null;

    const updated = await this.repository.updateVerification(verificationId, {
      status,
      reviewedBy: meta.actor || "admin",
      expiresAt,
    });

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: verificationId,
        action: `verification.${status.toLowerCase()}`,
        actor: meta.actor || "admin",
        newValue: updated,
      });
    }

    return updated;
  }

  async getVerificationStatus(subjectId, subjectType = "customer") {
    const records = await this.repository.listVerifications({ subjectId, subjectType });
    const now = Date.now();

    const active = records.filter((r) => {
      if (r.status !== "Verified") return false;
      if (r.expiresAt && new Date(r.expiresAt).getTime() < now) return false;
      return true;
    });

    const requirements = this.policyService.getPolicies().verificationRequirements || {};
    const required =
      requirements[`${subjectType}Minimum`] ||
      requirements.customerMinimum ||
      [];

    return {
      subjectId: String(subjectId),
      subjectType,
      verified: active.length >= required.length,
      verifications: records,
      requiredTypes: required,
      completedTypes: active.map((r) => r.type),
    };
  }

  async listVerifications(filters = {}) {
    return this.repository.listVerifications(filters);
  }
}

module.exports = VerificationService;
