class TransactionManager {
  constructor({ connection }) {
    this.connection = connection;
    this._active = null;
  }

  async run(callback) {
    const txId = `tx_${Date.now()}`;
    this._active = txId;
    try {
      await this.connection.query("BEGIN", []);
      const result = await callback({
        query: (sql, params) => this.connection.query(sql, params),
        id: txId,
      });
      await this.connection.query("COMMIT", []);
      return { result, txId, committed: true };
    } catch (error) {
      await this.connection.query("ROLLBACK", []);
      throw error;
    } finally {
      this._active = null;
    }
  }
}

module.exports = TransactionManager;
