const express = require("express");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller } = require("../../middleware/auth");
const SellerOperationsPlatform = require("./SellerOperationsPlatform");
const SellerOperationsAccess = require("./SellerOperationsAccess");

let sellerOperationsPlatformInstance = null;

function createSellerOperationsPlatform(options = {}) {
  sellerOperationsPlatformInstance = new SellerOperationsPlatform(options);
  return sellerOperationsPlatformInstance;
}

function getSellerOperationsPlatform() {
  if (!sellerOperationsPlatformInstance) {
    throw new Error("Seller Operations platform not initialized — call registerSellerOperationsPlatform first");
  }
  return sellerOperationsPlatformInstance;
}

function respondGuardFailure(res, error) {
  return res.status(error.statusCode || 403).json({
    success: false,
    reason: error.reason || "FEATURE_DISABLED",
    feature: error.feature,
    message: error.message,
  });
}

function runFeatureGuard(featureFlags, key, res, fn) {
  try {
    if (featureFlags) SellerOperationsAccess.assertFeatureEnabled(featureFlags, key);
    return fn();
  } catch (error) {
    if (error.reason === "FEATURE_DISABLED") {
      respondGuardFailure(res, error);
      return false;
    }
    throw error;
  }
}

function resolveFeatureFlags() {
  try {
    const { getPlatformIntegration } = require("../integration/PlatformIntegration");
    return getPlatformIntegration().featureFlags;
  } catch (_error) {
    return null;
  }
}

function registerSellerOperationsPlatform(app, options = {}) {
  const platform = createSellerOperationsPlatform(options);

  if (!options.useMemoryOnly) {
    try {
      platform.setModels({
        ConfigModel: require("../../model/sellerOperationsConfig"),
      });
    } catch (_error) {
      // isolated tests
    }
  }

  platform.initialize().catch((error) => {
    console.error("[SellerOperations] initialize failed:", error.message);
  });

  app.locals.sellerOperationsPlatform = platform;

  const router = express.Router();

  router.get(
    "/health",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.health() });
    })
  );

  router.get(
    "/features",
    catchAsyncErrors(async (_req, res) => {
      res.status(200).json({ success: true, data: platform.getSettings() });
    })
  );

  router.get(
    "/configuration",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      res.status(200).json({ success: true, data: { settings: platform.getSettings() } });
    })
  );

  router.put(
    "/configuration",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const settings = await platform.updateSettings(req.body?.settings || req.body, { admin: auth.userId });
      res.status(200).json({ success: true, data: { settings } });
    })
  );

  router.get(
    "/admin/dashboard",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "analytics", res, () => true)) return;
      const data = await platform.analyticsService.getAdminDashboard();
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/inventory",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "inventory", res, () => true)) return;
      const data = await platform.repository.listAllInventory();
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/suppliers",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "suppliers", res, () => true)) return;
      const data = await platform.repository.listAllSuppliers();
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/purchase-orders",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "purchaseOrders", res, () => true)) return;
      const data = await platform.repository.listPurchaseOrders(null, { status: req.query.status });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/admin/returns",
    isAuthenticated,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertSuperAdmin(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "returns", res, () => true)) return;
      const data = await platform.repository.listReturns(null, { status: req.query.status });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/inventory",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "inventory", res, () => true)) return;
      const data = await platform.inventoryService.listInventory(auth.vendorId);
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/inventory/:productId",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "inventory", res, () => true)) return;
      const data = await platform.inventoryService.getInventory(auth.vendorId, req.params.productId);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/inventory/:productId/adjust",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "inventory", res, () => true)) return;
      const data = await platform.inventoryService.adjustInventory(
        auth.vendorId,
        req.params.productId,
        req.body,
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.put(
    "/vendor/inventory/:productId/thresholds",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "lowStock", res, () => true)) return;
      const data = await platform.inventoryService.updateThresholds(
        auth.vendorId,
        req.params.productId,
        req.body,
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/alerts",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "notifications", res, () => true)) return;
      const data = await platform.lowStockAlertService.listAlerts(auth.vendorId, {
        unreadOnly: req.query.unreadOnly === "true",
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/suppliers",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "suppliers", res, () => true)) return;
      const data = await platform.supplierService.listSuppliers(auth.vendorId);
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/suppliers",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "suppliers", res, () => true)) return;
      const data = await platform.supplierService.createSupplier(auth.vendorId, req.body, {
        actor: auth.vendorId,
      });
      res.status(201).json({ success: true, data });
    })
  );

  router.put(
    "/vendor/suppliers/:supplierId",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "suppliers", res, () => true)) return;
      const data = await platform.supplierService.updateSupplier(
        auth.vendorId,
        req.params.supplierId,
        req.body,
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/purchase-orders",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "purchaseOrders", res, () => true)) return;
      const data = await platform.purchaseOrderService.listPurchaseOrders(auth.vendorId, {
        status: req.query.status,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/purchase-orders",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "purchaseOrders", res, () => true)) return;
      const data = await platform.purchaseOrderService.createPurchaseOrder(auth.vendorId, req.body, {
        actor: auth.vendorId,
      });
      res.status(201).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/purchase-orders/:purchaseOrderId/status",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "purchaseOrders", res, () => true)) return;
      const data = await platform.purchaseOrderService.updateStatus(
        auth.vendorId,
        req.params.purchaseOrderId,
        req.body.status,
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/purchase-orders/:purchaseOrderId/receive",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "purchaseOrders", res, () => true)) return;
      const data = await platform.purchaseOrderService.receiveStock(
        auth.vendorId,
        req.params.purchaseOrderId,
        req.body.receipts || req.body,
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/stock-movements",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "stockMovements", res, () => true)) return;
      const data = await platform.stockMovementService.listMovements({
        vendorId: auth.vendorId,
        productId: req.query.productId,
        type: req.query.type,
      });
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/returns",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "returns", res, () => true)) return;
      const data = await platform.returnService.listReturns(auth.vendorId, { status: req.query.status });
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/returns",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "returns", res, () => true)) return;
      const data = await platform.returnService.createReturn(auth.vendorId, req.body, {
        actor: auth.vendorId,
      });
      res.status(201).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/returns/:returnId/status",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "returns", res, () => true)) return;
      const data = await platform.returnService.updateStatus(
        auth.vendorId,
        req.params.returnId,
        req.body.status,
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/bulk/import",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "bulkOperations", res, () => true)) return;
      const data = await platform.bulkOperationsService.importCsv(
        auth.vendorId,
        req.body.csv,
        req.body.type || "stock",
        { actor: auth.vendorId }
      );
      res.status(data.applied ? 200 : 400).json({ success: data.applied, data });
    })
  );

  router.get(
    "/vendor/bulk/export",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "bulkOperations", res, () => true)) return;
      const data = await platform.bulkOperationsService.exportCsv(
        auth.vendorId,
        req.query.type || "stock",
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/sku",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "skuBarcode", res, () => true)) return;
      const data = await platform.skuBarcodeService.assignSku(
        auth.vendorId,
        req.body.productId,
        req.body.sku,
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.post(
    "/vendor/barcode",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "skuBarcode", res, () => true)) return;
      const data = await platform.skuBarcodeService.assignBarcode(
        auth.vendorId,
        req.body.productId,
        req.body.barcode,
        { actor: auth.vendorId }
      );
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/sku/search",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "skuBarcode", res, () => true)) return;
      const data = await platform.skuBarcodeService.searchBySku(auth.vendorId, req.query.sku);
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/barcode/search",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "skuBarcode", res, () => true)) return;
      const data = await platform.skuBarcodeService.searchByBarcode(auth.vendorId, req.query.barcode);
      res.status(200).json({ success: true, data });
    })
  );

  router.get(
    "/vendor/dashboard",
    isSeller,
    catchAsyncErrors(async (req, res) => {
      const auth = SellerOperationsAccess.assertVendor(req);
      if (!auth.valid) return res.status(auth.statusCode).json({ success: false, reason: auth.reason });
      const featureFlags = resolveFeatureFlags();
      if (!runFeatureGuard(featureFlags, "analytics", res, () => true)) return;
      const data = await platform.analyticsService.getVendorDashboard(auth.vendorId);
      res.status(200).json({ success: true, data });
    })
  );

  app.use("/api/v2/marketplace/seller-operations", router);
  return platform;
}

module.exports = {
  SellerOperationsPlatform,
  createSellerOperationsPlatform,
  getSellerOperationsPlatform,
  registerSellerOperationsPlatform,
};
