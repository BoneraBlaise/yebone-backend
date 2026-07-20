class LowStockAlertService {
  constructor({ repository, audit, observability }) {
    this.repository = repository;
    this.audit = audit;
    this.observability = observability;
    this.notificationHooks = [];
  }

  registerHook(fn) {
    if (typeof fn === "function") this.notificationHooks.push(fn);
  }

  async evaluate(vendorId, snapshot, meta = {}) {
    const status = snapshot.stockStatus;
    if (!["low", "critical", "out_of_stock"].includes(status)) return null;

    const alert = await this.repository.createAlert(vendorId, {
      type: status,
      productId: snapshot.productId,
      message: this._messageForStatus(status, snapshot),
      channels: { inApp: true, email: false },
    });

    await this.audit.record({
      platform: "sellerOperations",
      resource: snapshot.productId,
      action: "inventory.alert.created",
      actor: meta.actor || vendorId,
      newValue: alert,
    });

    if (this.observability?.increment) {
      this.observability.increment("seller_operations.low_stock_alert", { status });
    }

    for (const hook of this.notificationHooks) {
      try {
        hook({ vendorId, alert, snapshot });
      } catch (_error) {
        // hooks are best-effort
      }
    }

    return alert;
  }

  _messageForStatus(status, snapshot) {
    if (status === "out_of_stock") return `Product ${snapshot.productId} is out of stock`;
    if (status === "critical") return `Product ${snapshot.productId} is at critical stock (${snapshot.availableStock})`;
    return `Product ${snapshot.productId} is low on stock (${snapshot.availableStock})`;
  }

  async listAlerts(vendorId, filters = {}) {
    return this.repository.listAlerts(vendorId, filters);
  }
}

module.exports = LowStockAlertService;
