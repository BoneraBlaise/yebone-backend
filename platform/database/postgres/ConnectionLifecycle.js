class ConnectionLifecycle {
  constructor({ connection }) {
    this.connection = connection;
    this._startedAt = null;
  }

  async start() {
    const result = await this.connection.connect();
    this._startedAt = Date.now();
    return result;
  }

  async stop() {
    return this.connection.disconnect();
  }

  uptimeMs() {
    return this._startedAt ? Date.now() - this._startedAt : 0;
  }
}

module.exports = ConnectionLifecycle;
