const { describe, it, before, beforeEach } = require("node:test");
const assert = require("node:assert/strict");

const SellerOperationsPlatform = require("../SellerOperationsPlatform");
const { registerSellerOperationsPlatform } = require("../index");
const { PlatformFeatureFlagService, PlatformFeatureFlagStore } = require("../../integration/features/PlatformFeatureFlagService");

describe("Seller Operations Phase 11", () => {
  before(() => {
    process.env.NODE_ENV = "test";
  });

  describe("SellerOperationsPlatform services", () => {
    let platform;

    beforeEach(async () => {
      platform = new SellerOperationsPlatform({ useMemoryOnly: true });
      const flags = new PlatformFeatureFlagService({ store: new PlatformFeatureFlagStore({ useMemoryOnly: true }) });
      await flags.refresh();
      platform.bindFeatureFlags(flags);
      await platform.initialize();
      platform.repository.resetForTests();
      platform.catalogBridge.resetForTests();
      platform.catalogBridge.seedProduct({
        _id: "prod_1",
        name: "Widget",
        stock: 20,
        discountPrice: 1000,
        shopId: "vendor_1",
      });
      platform.catalogBridge.seedProduct({
        _id: "prod_2",
        name: "Gadget",
        stock: 3,
        discountPrice: 500,
        shopId: "vendor_1",
      });
    });

    it("tracks extended inventory with available stock", async () => {
      await platform.inventoryService.ensureInventory("vendor_1", "prod_1", {
        reservedStock: 5,
        damagedStock: 2,
      });
      const snapshot = await platform.inventoryService.getInventory("vendor_1", "prod_1");
      assert.equal(snapshot.currentStock, 20);
      assert.equal(snapshot.reservedStock, 5);
      assert.equal(snapshot.damagedStock, 2);
      assert.equal(snapshot.availableStock, 13);
    });

    it("adjusts inventory and records stock movement", async () => {
      const updated = await platform.inventoryService.adjustInventory(
        "vendor_1",
        "prod_1",
        { quantityDelta: -4, reasonCode: "sale", notes: "Online order" },
        { actor: "vendor_1" }
      );
      assert.equal(updated.currentStock, 16);

      const movements = await platform.stockMovementService.listMovements({ vendorId: "vendor_1" });
      assert.ok(movements.some((m) => m.type === "adjustment" || m.type === "sale"));
    });

    it("creates low stock alerts", async () => {
      await platform.inventoryService.ensureInventory("vendor_1", "prod_2", {
        lowStockThreshold: 10,
        criticalStockThreshold: 2,
      });
      await platform.inventoryService.adjustInventory(
        "vendor_1",
        "prod_2",
        { quantityDelta: 0, reasonCode: "count" },
        { actor: "vendor_1" }
      );
      const alerts = await platform.lowStockAlertService.listAlerts("vendor_1");
      assert.ok(alerts.length >= 1);
    });

    it("manages suppliers with purchase history", async () => {
      const supplier = await platform.supplierService.createSupplier(
        "vendor_1",
        { name: "Acme Supplies", email: "buy@acme.test" },
        { actor: "vendor_1" }
      );
      const po = await platform.purchaseOrderService.createPurchaseOrder(
        "vendor_1",
        {
          supplierId: supplier.supplierId,
          lineItems: [{ productId: "prod_1", quantity: 10 }],
          status: "ordered",
        },
        { actor: "vendor_1" }
      );
      assert.equal(po.status, "ordered");

      const profile = await platform.supplierService.getSupplier("vendor_1", supplier.supplierId);
      assert.equal(profile.purchaseHistory.length, 1);
    });

    it("receives purchase orders and updates stock", async () => {
      const po = await platform.purchaseOrderService.createPurchaseOrder(
        "vendor_1",
        {
          supplierId: "sup_test",
          lineItems: [{ productId: "prod_1", quantity: 5 }],
          status: "ordered",
        },
        { actor: "vendor_1" }
      );

      const received = await platform.purchaseOrderService.receiveStock(
        "vendor_1",
        po.purchaseOrderId,
        [{ productId: "prod_1", quantity: 5 }],
        { actor: "vendor_1" }
      );
      assert.equal(received.status, "received");

      const snapshot = await platform.inventoryService.getInventory("vendor_1", "prod_1");
      assert.equal(snapshot.currentStock, 25);
    });

    it("processes returns through RMA lifecycle", async () => {
      const rma = await platform.returnService.createReturn(
        "vendor_1",
        { orderId: "order_1", productId: "prod_1", quantity: 1, reason: "Damaged" },
        { actor: "vendor_1" }
      );
      assert.equal(rma.status, "requested");

      const approved = await platform.returnService.updateStatus(
        "vendor_1",
        rma.returnId,
        "approved",
        { actor: "vendor_1" }
      );
      assert.equal(approved.status, "approved");

      const received = await platform.returnService.updateStatus(
        "vendor_1",
        rma.returnId,
        "received",
        { actor: "vendor_1" }
      );
      assert.equal(received.status, "received");
    });

    it("validates bulk import before apply", async () => {
      await platform.inventoryService.ensureInventory("vendor_1", "prod_1");
      const invalid = await platform.bulkOperationsService.importCsv(
        "vendor_1",
        "productId,stock\n,bad\n",
        "stock",
        { actor: "vendor_1" }
      );
      assert.equal(invalid.applied, false);
      assert.ok(invalid.validation.errors.length > 0);

      const valid = await platform.bulkOperationsService.importCsv(
        "vendor_1",
        "productId,stock\nprod_1,30\n",
        "stock",
        { actor: "vendor_1" }
      );
      assert.equal(valid.applied, true);
      const snapshot = await platform.inventoryService.getInventory("vendor_1", "prod_1");
      assert.equal(snapshot.currentStock, 30);
    });

    it("exports inventory CSV", async () => {
      await platform.inventoryService.ensureInventory("vendor_1", "prod_1");
      const result = await platform.bulkOperationsService.exportCsv("vendor_1", "stock", {
        actor: "vendor_1",
      });
      assert.ok(result.csv.includes("productId"));
      assert.ok(result.rowCount >= 1);
    });

    it("assigns SKU and barcode with duplicate prevention", async () => {
      const sku = await platform.skuBarcodeService.assignSku("vendor_1", "prod_1", null, {
        actor: "vendor_1",
      });
      assert.ok(sku.sku.startsWith("SKU-"));

      await assert.rejects(
        () => platform.skuBarcodeService.assignSku("vendor_1", "prod_2", sku.sku, { actor: "vendor_1" }),
        (error) => error.reason === "DUPLICATE_SKU"
      );

      await platform.skuBarcodeService.assignBarcode("vendor_1", "prod_1", "1234567890", {
        actor: "vendor_1",
      });
      const found = await platform.skuBarcodeService.searchByBarcode("vendor_1", "1234567890");
      assert.equal(found.productId, "prod_1");
    });

    it("computes vendor analytics dashboard", async () => {
      await platform.inventoryService.ensureInventory("vendor_1", "prod_1");
      await platform.stockMovementService.recordMovement({
        vendorId: "vendor_1",
        productId: "prod_1",
        type: "sale",
        quantity: 5,
        actor: "vendor_1",
      });

      const dashboard = await platform.analyticsService.getVendorDashboard("vendor_1");
      assert.ok(dashboard.inventoryValue >= 0);
      assert.ok(Array.isArray(dashboard.topSellingProducts));
      assert.ok(Array.isArray(dashboard.lowStock));
      assert.ok(Array.isArray(dashboard.purchaseHistory));
    });

    it("computes admin global insights", async () => {
      await platform.inventoryService.ensureInventory("vendor_1", "prod_1");
      const dashboard = await platform.analyticsService.getAdminDashboard();
      assert.ok(dashboard.inventoryHealth.trackedProducts >= 1);
      assert.ok(dashboard.globalStockInsights);
    });
  });

  describe("HTTP registration", () => {
    it("registers health route", async () => {
      const express = require("express");
      const http = require("http");
      const app = express();
      app.use(express.json());
      registerSellerOperationsPlatform(app, { useMemoryOnly: true });

      const server = http.createServer(app);
      await new Promise((resolve) => server.listen(0, resolve));
      const { port } = server.address();

      const response = await fetch(`http://127.0.0.1:${port}/api/v2/marketplace/seller-operations/health`);
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.data.module, "seller-operations");

      await new Promise((resolve) => server.close(resolve));
    });
  });
});
