class HealthController {
  constructor({ livenessProbe, readinessProbe } = {}) {
    this.livenessProbe = livenessProbe;
    this.readinessProbe = readinessProbe;
  }

  async health(req, res) {
    const [liveness, readiness] = await Promise.all([
      this.livenessProbe.check(),
      this.readinessProbe.check(),
    ]);

    const healthy = liveness.healthy && readiness.healthy;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      healthy,
      liveness,
      readiness,
      timestamp: new Date().toISOString(),
    });
  }

  async liveness(req, res) {
    const result = await this.livenessProbe.check();
    res.status(result.healthy ? 200 : 503).json(result);
  }

  async readiness(req, res) {
    const result = await this.readinessProbe.check();
    res.status(result.healthy ? 200 : 503).json(result);
  }
}

module.exports = HealthController;
