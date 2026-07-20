# Seller Operations — Phase 11

**Tag:** `seller-operations-v1`  
**Baseline:** `growth-commerce-v1`  
**Branch:** `feature/seller-operations`

Seller Operations extends inventory, purchasing, and vendor daily operations without modifying frozen core modules. Catalog stock sync delegates to `ProductPlatform`; returns delegate refund requests to `OrderPlatform`.

---

## Module Location

```
marketplace/seller-operations/
├── SellerOperationsPlatform.js       # Composition root
├── SellerOperationsConfigStore.js    # Feature settings
├── SellerOperationsRepository.js     # Inventory, suppliers, POs, movements, returns
├── SellerOperationsCatalogBridge.js  # Extends ProductInventory via catalog sync
├── SellerOperationsOrdersBridge.js   # RMA refund delegation to Orders
├── InventoryService.js
├── StockMovementService.js
├── LowStockAlertService.js
├── SupplierService.js
├── PurchaseOrderService.js
├── ReturnService.js
├── BulkOperationsService.js
├── SkuBarcodeService.js
├── SellerAnalyticsService.js
├── SellerOperationsAccess.js
├── SellerOperationsHealth.js
└── index.js                          # Express routes
```

**API base:** `/api/v2/marketplace/seller-operations`

---

## Features

| Feature | Description |
|---------|-------------|
| Inventory Management | Current, reserved, available, incoming, damaged stock; adjustments; history; reason codes; notes |
| Low Stock Management | Thresholds, critical levels, out-of-stock status, in-app alert hooks |
| Purchase Orders | Draft → ordered → partially_received → received → cancelled; receiving updates stock |
| Supplier Management | Profiles, contact info, status, purchase history, notes |
| Stock Movements | Auditable purchase, sale, return, adjustment, damage, correction, cancellation |
| Returns (RMA) | requested → approved → rejected → received → refunded → cancelled; reuses Orders refund |
| Bulk Operations | CSV import/export with validation for stock, price, status |
| SKU & Barcode | Auto SKU generation, search, duplicate prevention |
| Seller Analytics | Inventory value, top sellers, low/out of stock, turnover, purchase history |
| Responsive Web | Admin + vendor panels (desktop tables, mobile cards) |

---

## Platform Integration

| Concern | Integration |
|---------|-------------|
| Feature flag | `sellerOperations` domain in `PlatformFeatureFlagService` |
| RBAC | `SellerOperationsAccess` → `PlatformAuthService` |
| Audit | `PlatformAuditAdapter` for inventory, PO, return, bulk events |
| Observability | `PlatformObservabilityService` via platform bind |
| Catalog | `SellerOperationsCatalogBridge` syncs `product.stock` without rewriting catalog |
| Orders | `SellerOperationsOrdersBridge` delegates refunds |

---

## Verification

```bash
npm run test:seller-operations
npm run verify:seller-operations
```

---

## Frontend Routes

| Role | Route |
|------|-------|
| Super Admin | `/admin/seller-operations` |
| Vendor | `/dashboard-seller-operations` |

**Seller Operations frozen at `seller-operations-v1`.**
