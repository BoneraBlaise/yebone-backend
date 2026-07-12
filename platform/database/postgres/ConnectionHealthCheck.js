class ConnectionHealthCheck {
  constructor({ connection }) {
    this.connection = connection;
  }

  async run() {
    try {
      const result = await this.connection.adapter.healthCheck();
      return {
        name: "postgresql",
        healthy: result.healthy,
        details: result,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        name: "postgresql",
        healthy: false,
        error: error.message,
        checkedAt: new Date().toISOString(),
      };
    }
  }
}

module.exports = ConnectionHealthCheck;
