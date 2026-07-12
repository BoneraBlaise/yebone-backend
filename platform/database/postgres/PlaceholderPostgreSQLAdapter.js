class PlaceholderPostgreSQLAdapter {
  constructor() {
    this.connected = false;
    this._queries = [];
  }

  async connect(config) {
    this.connected = true;
    return {
      connected: true,
      mode: "placeholder",
      url: config?.postgresUrl ? "[configured]" : "[not-configured]",
    };
  }

  async disconnect() {
    this.connected = false;
    return { disconnected: true };
  }

  async query(sql, params = []) {
    this._queries.push({ sql, params, at: Date.now() });
    return { rows: [], rowCount: 0, mode: "placeholder" };
  }

  async healthCheck() {
    return {
      healthy: true,
      mode: "placeholder",
      connected: this.connected,
    };
  }
}

module.exports = PlaceholderPostgreSQLAdapter;
