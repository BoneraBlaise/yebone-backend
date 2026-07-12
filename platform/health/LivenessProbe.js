class LivenessProbe {
  constructor({ container } = {}) {
    this.container = container;
  }

  async check() {
    return {
      status: "alive",
      healthy: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      pid: process.pid,
    };
  }
}

module.exports = LivenessProbe;
