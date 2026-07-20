const crypto = require("crypto");

class SkuBarcodeService {
  constructor({ repository, catalogBridge, audit }) {
    this.repository = repository;
    this.catalogBridge = catalogBridge;
    this.audit = audit;
  }

  generateSku(vendorId, productId) {
    const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    return `SKU-${String(vendorId).slice(-4).toUpperCase()}-${String(productId).slice(-4).toUpperCase()}-${suffix}`;
  }

  async assignSku(vendorId, productId, sku, meta = {}) {
    const resolvedSku = sku || this.generateSku(vendorId, productId);
    await this.repository.registerSku(vendorId, resolvedSku, productId);
    await this.repository.upsertInventory(vendorId, productId, { sku: resolvedSku });

    await this.audit.record({
      platform: "sellerOperations",
      resource: productId,
      action: "sku.assigned",
      actor: meta.actor || vendorId,
      newValue: { sku: resolvedSku },
    });

    return { productId, sku: resolvedSku };
  }

  async assignBarcode(vendorId, productId, barcode, meta = {}) {
    const existing = await this.repository.findByBarcode(vendorId, barcode);
    if (existing && existing.productId !== String(productId)) {
      const error = new Error("Barcode already assigned to another product");
      error.statusCode = 409;
      error.reason = "DUPLICATE_BARCODE";
      throw error;
    }

    await this.repository.upsertInventory(vendorId, productId, { barcode: String(barcode) });
    await this.audit.record({
      platform: "sellerOperations",
      resource: productId,
      action: "barcode.assigned",
      actor: meta.actor || vendorId,
      newValue: { barcode: String(barcode) },
    });

    return { productId, barcode: String(barcode) };
  }

  async searchBySku(vendorId, sku) {
    return this.repository.findBySku(vendorId, sku);
  }

  async searchByBarcode(vendorId, barcode) {
    return this.repository.findByBarcode(vendorId, barcode);
  }
}

module.exports = SkuBarcodeService;
