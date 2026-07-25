class TrustScoreService {
  constructor({ repository, policyService, verificationService, audit }) {
    this.repository = repository;
    this.policyService = policyService;
    this.verificationService = verificationService;
    this.audit = audit;
  }

  _clamp(score) {
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  async computeTrustScore(subjectId, metrics = {}, meta = {}) {
    const weights = this.policyService.getTrustWeights();
    const factors = {
      successfulOrders: Number(metrics.successfulOrders || 0),
      cancelledOrders: Number(metrics.cancelledOrders || 0),
      refundRate: Number(metrics.refundRate || 0),
      disputeRate: Number(metrics.disputeRate || 0),
      verificationLevel: Number(metrics.verificationLevel || 0),
      accountAgeDays: Number(metrics.accountAgeDays || 0),
      averageRating: Number(metrics.averageRating || 0),
      policyViolations: Number(metrics.policyViolations || 0),
    };

    let raw = 50;
    raw += factors.successfulOrders * (weights.successfulOrders / 100);
    raw += factors.cancelledOrders * (weights.cancelledOrders / 100);
    raw -= factors.refundRate * Math.abs(weights.refundRate / 100);
    raw -= factors.disputeRate * Math.abs(weights.disputeRate / 100);
    raw += factors.verificationLevel * (weights.verificationLevel / 100);
    raw += Math.min(factors.accountAgeDays / 365, 1) * weights.accountAge;
    raw += (factors.averageRating / 5) * weights.averageRating;
    raw += factors.policyViolations * (weights.policyViolations / 100);

    const score = this._clamp(raw);
    const record = await this.repository.upsertTrustScore(subjectId, {
      subjectType: metrics.subjectType || "customer",
      score,
      factors,
      weights,
    });

    if (this.audit) {
      await this.audit.record({
        platform: "buyerProtection",
        resource: subjectId,
        action: "trust_score.computed",
        actor: meta.actor || "system",
        newValue: record,
      });
    }

    return record;
  }

  async getTrustScore(subjectId) {
    const existing = await this.repository.getTrustScore(subjectId);
    if (existing) return existing;

    const verification = await this.verificationService.getVerificationStatus(subjectId);
    return this.computeTrustScore(subjectId, {
      verificationLevel: verification.completedTypes.length,
      subjectType: verification.subjectType,
    });
  }

  async listTrustScores() {
    return this.repository.listTrustScores();
  }

  explainScore(subjectId) {
    return this.getTrustScore(subjectId).then((record) => ({
      subjectId,
      score: record.score,
      factors: record.factors,
      weights: record.weights,
      explanation:
        "Trust score is computed from configurable weights applied to order history, disputes, verification, ratings, and policy violations.",
    }));
  }
}

module.exports = TrustScoreService;
