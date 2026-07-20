class BulkOperationsService {
  constructor({ repository, inventoryService, catalogBridge, audit }) {
    this.repository = repository;
    this.inventoryService = inventoryService;
    this.catalogBridge = catalogBridge;
    this.audit = audit;
  }

  _parseCsv(csvText = "") {
    const lines = String(csvText)
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
    if (!lines.length) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line, index) => {
      const values = line.split(",").map((v) => v.trim());
      const row = {};
      headers.forEach((header, i) => {
        row[header] = values[i];
      });
      row._row = index + 2;
      return row;
    });
  }

  _toCsv(rows, headers) {
    const headerLine = headers.join(",");
    const body = rows
      .map((row) => headers.map((header) => String(row[header] ?? "")).join(","))
      .join("\n");
    return `${headerLine}\n${body}`;
  }

  validateImportRows(rows = [], type = "stock") {
    const errors = [];
    const valid = [];

    for (const row of rows) {
      if (!row.productId) {
        errors.push({ row: row._row, message: "productId is required" });
        continue;
      }
      if (type === "stock" && (row.stock === undefined || Number.isNaN(Number(row.stock)))) {
        errors.push({ row: row._row, message: "stock must be a number" });
        continue;
      }
      if (type === "price" && (row.price === undefined || Number.isNaN(Number(row.price)))) {
        errors.push({ row: row._row, message: "price must be a number" });
        continue;
      }
      if (type === "status" && !row.status) {
        errors.push({ row: row._row, message: "status is required" });
        continue;
      }
      valid.push(row);
    }

    return { valid, errors, canApply: errors.length === 0 };
  }

  async importCsv(vendorId, csvText, type = "stock", meta = {}) {
    const rows = this._parseCsv(csvText);
    const validation = this.validateImportRows(rows, type);
    if (!validation.canApply) {
      return { applied: false, validation };
    }

    const results = [];
    for (const row of validation.valid) {
      if (type === "stock") {
        const snapshot = await this.inventoryService.ensureInventory(vendorId, row.productId);
        const delta = Number(row.stock) - Number(snapshot.currentStock || 0);
        results.push(
          await this.inventoryService.adjustInventory(
            vendorId,
            row.productId,
            { quantityDelta: delta, reasonCode: "correction", notes: "Bulk CSV import" },
            { actor: meta.actor || vendorId }
          )
        );
      } else if (type === "price") {
        results.push(
          await this.catalogBridge.updateCatalogProduct(row.productId, {
            discountPrice: Number(row.price),
          })
        );
      } else if (type === "status") {
        results.push(
          await this.catalogBridge.updateCatalogProduct(row.productId, {
            productType: row.status,
          })
        );
      }
    }

    const job = await this.repository.createBulkJob(vendorId, {
      type: `import_${type}`,
      rowCount: validation.valid.length,
      status: "completed",
    });

    await this.audit.record({
      platform: "sellerOperations",
      resource: job.jobId,
      action: "bulk.import.completed",
      actor: meta.actor || vendorId,
      newValue: { type, rowCount: validation.valid.length },
    });

    return { applied: true, validation, results, job };
  }

  async exportCsv(vendorId, type = "stock", meta = {}) {
    const inventory = await this.repository.listInventory(vendorId);
    let rows = [];
    let headers = [];

    if (type === "stock") {
      headers = ["productId", "sku", "barcode", "stock", "reservedStock", "damagedStock"];
      rows = await Promise.all(
        inventory.map(async (record) => {
          const snapshot = await this.inventoryService.getInventory(vendorId, record.productId);
          return {
            productId: record.productId,
            sku: record.sku || "",
            barcode: record.barcode || "",
            stock: snapshot.currentStock,
            reservedStock: snapshot.reservedStock,
            damagedStock: snapshot.damagedStock,
          };
        })
      );
    } else if (type === "price") {
      headers = ["productId", "price"];
      rows = await Promise.all(
        inventory.map(async (record) => {
          const product = await this.catalogBridge.getProduct(record.productId);
          return { productId: record.productId, price: product?.discountPrice || 0 };
        })
      );
    } else {
      headers = ["productId", "status"];
      rows = inventory.map((record) => ({ productId: record.productId, status: "normal" }));
    }

    const csv = this._toCsv(rows, headers);
    const job = await this.repository.createBulkJob(vendorId, {
      type: `export_${type}`,
      rowCount: rows.length,
      status: "completed",
    });

    await this.audit.record({
      platform: "sellerOperations",
      resource: job.jobId,
      action: "bulk.export.completed",
      actor: meta.actor || vendorId,
      newValue: { type, rowCount: rows.length },
    });

    return { csv, rowCount: rows.length, job };
  }
}

module.exports = BulkOperationsService;
