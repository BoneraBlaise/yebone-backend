class AnalyticsService {
  constructor({ repository }) {
    this.repository = repository;
  }

  async getAdminDashboard() {
    const disputes = await this.repository.listDisputes();
    const escrows = await this.repository.listEscrows();
    const protections = await this.repository.listProtections();
    const verifications = await this.repository.listVerifications();
    const fraudAlerts = await this.repository.listFraudAlerts({ status: "open" });
    const trustScores = await this.repository.listTrustScores();

    const openDisputes = disputes.filter((d) => !["CLOSED", "REJECTED", "REFUNDED"].includes(d.status));
    const heldEscrows = escrows.filter((e) =>
      ["PENDING", "FUNDS_HELD", "DELIVERY_CONFIRMED", "READY_FOR_RELEASE"].includes(e.status)
    );
    const activeProtections = protections.filter((p) => p.status === "active");
    const pendingVerifications = verifications.filter((v) =>
      ["Pending", "Submitted", "Under Review"].includes(v.status)
    );

    const avgTrust =
      trustScores.length > 0
        ? Math.round(trustScores.reduce((s, t) => s + t.score, 0) / trustScores.length)
        : null;

    return {
      disputes: {
        total: disputes.length,
        open: openDisputes.length,
        byStatus: disputes.reduce((acc, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        }, {}),
      },
      escrow: {
        total: escrows.length,
        held: heldEscrows.length,
        byStatus: escrows.reduce((acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        }, {}),
      },
      protection: {
        total: protections.length,
        active: activeProtections.length,
      },
      verification: {
        total: verifications.length,
        pending: pendingVerifications.length,
      },
      fraud: {
        openAlerts: fraudAlerts.length,
        byRisk: fraudAlerts.reduce((acc, a) => {
          acc[a.riskLevel] = (acc[a.riskLevel] || 0) + 1;
          return acc;
        }, {}),
      },
      trustScore: {
        subjectsTracked: trustScores.length,
        averageScore: avgTrust,
      },
      phase: "14.0",
    };
  }
}

module.exports = AnalyticsService;
