const SellerOperationsRepository = require("./SellerOperationsRepository");
const SellerOperationsConfigStore = require("./SellerOperationsConfigStore");
const SellerOperationsCatalogBridge = require("./SellerOperationsCatalogBridge");
const SellerOperationsOrdersBridge = require("./SellerOperationsOrdersBridge");
const StockMovementService = require("./StockMovementService");
const LowStockAlertService = require("./LowStockAlertService");
const InventoryService = require("./InventoryService");
const SupplierService = require("./SupplierService");
const PurchaseOrderService = require("./PurchaseOrderService");
const ReturnService = require("./ReturnService");
const SkuBarcodeService = require("./SkuBarcodeService");
const BulkOperationsService = require("./BulkOperationsService");
const SellerAnalyticsService = require("./SellerAnalyticsService");
const SellerOperationsHealth = require("./SellerOperationsHealth");
const PlatformAuditAdapter = require("../integration/audit/PlatformAuditAdapter");

class SellerOperationsPlatform {
  constructor(options = {}) {
    this.useMemoryOnly = Boolean(options.useMemoryOnly);
    this.featureFlags = options.featureFlags || null;
    this.observability = options.observability || null;

    this.repository = options.repository || new SellerOperationsRepository({ useMemoryOnly: this.useMemoryOnly });
    this.configStore =
      options.configStore || new SellerOperationsConfigStore({ useMemoryOnly: this.useMemoryOnly });
    this.catalogBridge =
      options.catalogBridge ||
      new SellerOperationsCatalogBridge({ useMemoryOnly: this.useMemoryOnly });
    this.ordersBridge =
      options.ordersBridge || new SellerOperationsOrdersBridge({ useMemoryOnly: this.useMemoryOnly });

    const audit = { record: (payload) => PlatformAuditAdapter.record(payload) };

    this.stockMovementService =
      options.stockMovementService || new StockMovementService({ repository: this.repository, audit });
    this.lowStockAlertService =
      options.lowStockAlertService ||
      new LowStockAlertService({
        repository: this.repository,
        audit,
        observability: this.observability,
      });

    this.inventoryService =
      options.inventoryService ||
      new InventoryService({
        repository: this.repository,
        catalogBridge: this.catalogBridge,
        stockMovementService: this.stockMovementService,
        lowStockAlertService: this.lowStockAlertService,
        audit,
      });

    this.supplierService =
      options.supplierService || new SupplierService({ repository: this.repository, audit });
    this.purchaseOrderService =
      options.purchaseOrderService ||
      new PurchaseOrderService({
        repository: this.repository,
        inventoryService: this.inventoryService,
        stockMovementService: this.stockMovementService,
        audit,
      });
    this.returnService =
      options.returnService ||
      new ReturnService({
        repository: this.repository,
        inventoryService: this.inventoryService,
        audit,
        ordersBridge: this.ordersBridge,
      });
    this.skuBarcodeService =
      options.skuBarcodeService ||
      new SkuBarcodeService({
        repository: this.repository,
        catalogBridge: this.catalogBridge,
        audit,
      });
    this.bulkOperationsService =
      options.bulkOperationsService ||
      new BulkOperationsService({
        repository: this.repository,
        inventoryService: this.inventoryService,
        catalogBridge: this.catalogBridge,
        audit,
      });
    this.analyticsService =
      options.analyticsService ||
      new SellerAnalyticsService({
        repository: this.repository,
        inventoryService: this.inventoryService,
        catalogBridge: this.catalogBridge,
      });

    this.initialized = false;
  }

  setModels(models = {}) {
    if (models.ConfigModel) this.configStore.setModel(models.ConfigModel);
    this.repository.setModels(models);
  }

  bindFeatureFlags(featureFlags) {
    this.featureFlags = featureFlags;
  }

  bindObservability(observability) {
    this.observability = observability;
    if (this.lowStockAlertService) this.lowStockAlertService.observability = observability;
  }

  async initialize() {
    if (!this.initialized) {
      await this.configStore.initialize();
      this.initialized = true;
    }
    return this.health();
  }

  health() {
    return SellerOperationsHealth.check(this);
  }

  getSettings() {
    return this.configStore.getSettings();
  }

  async updateSettings(partial, meta = {}) {
    return this.configStore.updateSettings(partial, meta);
  }
}

module.exports = SellerOperationsPlatform;
