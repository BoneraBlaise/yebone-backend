const SellerOperationsSettingsDefaults = Object.freeze({
  inventory: { enabled: true },
  lowStock: { enabled: true },
  purchaseOrders: { enabled: true },
  suppliers: { enabled: true },
  stockMovements: { enabled: true },
  returns: { enabled: true },
  bulkOperations: { enabled: true },
  skuBarcode: { enabled: true },
  analytics: { enabled: true },
  notifications: { enabled: true, emailHooks: false, inAppHooks: true },
});

const REASON_CODES = Object.freeze([
  "purchase",
  "sale",
  "return",
  "adjustment",
  "damage",
  "correction",
  "cancellation",
  "receiving",
  "transfer",
  "count",
]);

const MOVEMENT_TYPES = Object.freeze([
  "purchase",
  "sale",
  "return",
  "adjustment",
  "damage",
  "correction",
  "cancellation",
]);

const PO_STATUSES = Object.freeze([
  "draft",
  "ordered",
  "partially_received",
  "received",
  "cancelled",
]);

const RMA_STATUSES = Object.freeze([
  "requested",
  "approved",
  "rejected",
  "received",
  "refunded",
  "cancelled",
]);

const SUPPLIER_STATUSES = Object.freeze(["active", "inactive", "archived"]);

module.exports = {
  SellerOperationsSettingsDefaults,
  REASON_CODES,
  MOVEMENT_TYPES,
  PO_STATUSES,
  RMA_STATUSES,
  SUPPLIER_STATUSES,
};
