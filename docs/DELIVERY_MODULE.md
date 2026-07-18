# Yebone Delivery Module

**Phase:** 8.0 — Delivery Module Foundation  
**Tag:** `delivery-foundation-v1`  
**Baseline:** `yebo-ai-memory-v1`  
**Branch:** `feature/delivery-foundation`

Related: [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md) · [PROJECT_STATUS.md](./PROJECT_STATUS.md) · [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md)

---

## Overview

The Delivery module is an independent domain platform under `marketplace/delivery/`. It manages delivery creation, lifecycle, courier assignment, structured addresses, tracking numbers, and observability without modifying frozen Orders, Payments, Search, Catalog, Vendor, Core, or AI modules.

This foundation supports future marketplace, rental, and service deliveries.

---

## Composition Root

`DeliveryPlatform` orchestrates:

| Component | Responsibility |
|-----------|------------------|
| `DeliveryStateMachine` | Validated status transitions |
| `DeliveryValidation` | Input, address, fee, courier validation |
| `DeliveryAddress` | Structured Rwanda-style addresses |
| `DeliveryTracking` | Unique tracking number generation |
| `DeliveryRepository` | In-memory delivery store (foundation) |
| `DeliveryHistory` | Status and assignment audit trail |
| `DeliveryAnalytics` | Created, assigned, cancelled, lifecycle metrics |
| `DeliverySecurity` | Auth and ownership checks |
| `DeliveryHealth` | Platform readiness probe |

---

## Delivery Entity

| Field | Description |
|-------|-------------|
| `deliveryId` | Unique delivery identifier |
| `orderId` | Linked marketplace order |
| `customerId` | Delivery recipient owner |
| `vendorId` | Fulfilling vendor |
| `courierId` | Assigned courier (nullable) |
| `pickupAddress` | Structured pickup location |
| `deliveryAddress` | Structured drop-off location |
| `deliveryFee` | Non-negative delivery cost |
| `status` | Lifecycle state |
| `trackingNumber` | Public tracking reference |
| `createdAt` / `updatedAt` | Timestamps |
| `metadata` | Extensible key/value bag |

---

## Delivery Status Lifecycle

```
PENDING → CONFIRMED → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
                ↓          ↓           ↓            ↓
            CANCELLED  CANCELLED    FAILED       FAILED
```

Terminal states: `DELIVERED`, `FAILED`, `CANCELLED`

All transitions are validated by `DeliveryStateMachine`. Invalid transitions return `409 INVALID_TRANSITION`.

---

## Structured Address

Required fields:

- `country`, `province`, `district`, `sector`, `cell`, `village`, `street`

Optional:

- `referenceNote`
- `latitude` / `longitude` (must be provided as a pair)

No map integration in this phase.

---

## Courier Assignment

| Operation | Behavior |
|-----------|----------|
| Assign | `CONFIRMED → ASSIGNED` with `courierId` |
| Reassign | Updates `courierId` while `ASSIGNED` |
| Remove | Clears `courierId`, returns to `CONFIRMED` |

Courier application, fleet management, and earnings are out of scope.

---

## Tracking

- Format: `YEB-DLV-{timestamp}-{random}`
- Lookup by tracking number (public)
- Lookup by delivery id (authenticated)
- Lookup by order id (authenticated, customer-owned)

No live GPS tracking.

---

## API Surface

Base path: `/api/v2/marketplace/delivery`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Platform health |
| GET | `/metrics` | Admin | Observability summary |
| POST | `/` | Operational | Create delivery |
| GET | `/` | Authenticated | List deliveries |
| GET | `/tracking/:trackingNumber` | Public | Track by number |
| GET | `/order/:orderId` | Customer | Delivery by order |
| GET | `/:deliveryId` | Authenticated | Delivery detail |
| GET | `/:deliveryId/history` | Customer/Admin | Status history |
| PATCH | `/:deliveryId/status` | Operational | Update status |
| POST | `/:deliveryId/assign` | Operational | Assign/reassign courier |
| DELETE | `/:deliveryId/assign` | Operational | Remove assignment |
| POST | `/:deliveryId/cancel` | Customer/Admin | Cancel delivery |

Operational roles: `admin`, `super-admin`, `courier`, `vendor`

---

## Platform Methods

```javascript
platform.createDelivery(input)
platform.getDelivery(deliveryId)
platform.getDeliveryByTracking(trackingNumber)
platform.getDeliveryByOrderId(orderId)
platform.assignCourier(deliveryId, courierId)
platform.removeCourierAssignment(deliveryId)
platform.updateStatus(deliveryId, status, options)
platform.cancelDelivery(deliveryId, options)
platform.listDeliveries(filters)
platform.getDeliveryHistory(deliveryId)
platform.getMetrics()
```

---

## Observability

`DeliveryAnalytics` tracks:

- Deliveries created
- Courier assignments
- Status changes
- Cancellations
- Average lifecycle duration (on `DELIVERED`)

---

## Security

- Session-scoped in-memory store per platform instance
- Customer access limited to owned deliveries
- Admin override for operational endpoints
- Public tracking exposes delivery status only (no auth required)
- No cross-user data leakage between repository instances

---

## Out of Scope (Future Phases)

- Driver mobile app
- Live GPS / Google Maps
- Route optimization / ETA
- Push notifications
- Fleet management
- External courier integrations
- Rental / service delivery workflows
- AI delivery assistant

---

## Verification

```bash
npm run test:delivery
npm run verify:delivery
```

---

## Integration Notes

Orders, payments, and AI modules remain frozen. Future phases may consume delivery status via compatibility hooks without modifying frozen business logic inside those modules.
