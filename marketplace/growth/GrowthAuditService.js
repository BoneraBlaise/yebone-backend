class GrowthAuditService {
  constructor(store) {
    this.store = store;
  }

  getHistory(limit = 100) {
    return this.store.getAuditLog(limit);
  }
}

module.exports = GrowthAuditService;
