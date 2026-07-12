class PostgreSQLConnection {
  constructor({ config, adapter }) {
    this.config = config;
    this.adapter = adapter;
    this.status = "disconnected";
  }

  async connect() {
    const result = await this.adapter.connect(this.config);
    this.status = result.connected ? "connected" : "placeholder";
    return result;
  }

  async disconnect() {
    const result = await this.adapter.disconnect();
    this.status = "disconnected";
    return result;
  }

  async query(sql, params = []) {
    return this.adapter.query(sql, params);
  }

  getStatus() {
    return this.status;
  }
}

module.exports = PostgreSQLConnection;
