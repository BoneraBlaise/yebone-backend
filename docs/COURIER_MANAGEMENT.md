# Yebone Courier Management

**Phase:** 8.2 — Courier Management  
**Tag:** `courier-management-v1`  
**Baseline:** `delivery-tracking-v1`  
**Branch:** `feature/courier-management`

Related: [DELIVERY_MODULE.md](./DELIVERY_MODULE.md) · [DELIVERY_TRACKING.md](./DELIVERY_TRACKING.md) · [PLATFORM_ARCHITECTURE.md](./PLATFORM_ARCHITECTURE.md)

---

## Overview

Phase 8.2 adds courier management as an extension to the delivery platform. Couriers can be registered, activated, assigned deliveries, and tracked with capacity and availability rules.

Delivery Foundation and Delivery Tracking business logic remain unchanged. Integration uses public `DeliveryPlatform` APIs only.

---

## Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| `CourierPlatform` | `marketplace/delivery/courier/` | Courier domain composition root |
| `CourierRepository` | In-memory courier store |
| `CourierAssignmentBridge` | Delivery assignment orchestration |
| `CourierHistory` | Immutable assignment/availability history |
| `CourierAnalytics` | Courier observability metrics |

---

## Courier Entity

| Field | Description |
|-------|-------------|
| `courierId` | Unique courier identifier |
| `fullName` | Courier name |
| `phoneNumber` | Unique contact number |
| `email` | Optional email |
| `vehicleType` | Vehicle category |
| `vehiclePlate` | Optional plate number |
| `status` | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `availability` | `AVAILABLE`, `BUSY`, `OFFLINE` |
| `capacity.maximumActiveDeliveries` | Max concurrent deliveries |
| `capacity.currentActiveDeliveries` | Current workload |
| `activeDeliveries` | Assigned delivery ids |
| `completedDeliveries` | Completed count |
| `metadata` | Extensible metadata |

---

## Status & Availability Rules

- Only **ACTIVE** couriers can receive assignments
- Only **AVAILABLE** couriers can receive new deliveries
- At capacity, availability auto-syncs to **BUSY**
- **OFFLINE** couriers cannot be assigned

---

## Assignment Rules

Before assignment, the platform validates:

1. Courier exists
2. Courier is `ACTIVE`
3. Courier is `AVAILABLE`
4. Capacity not exceeded
5. Delivery is not terminal

Assignment updates **both**:

- `CourierPlatform` workload/capacity/history
- `DeliveryPlatform.assignCourier()` via `CourierAssignmentBridge`

Removal uses `DeliveryPlatform.removeCourierAssignment()` and updates courier workload.

---

## Platform Methods

```javascript
platform.registerCourier(input)
platform.updateCourier(courierId, input, options)
platform.getCourier(courierId)
platform.listCouriers(filters)
platform.activateCourier(courierId, options)
platform.deactivateCourier(courierId, options)
platform.setAvailability(courierId, availability, options)
platform.assignDelivery(courierId, deliveryId, options)
platform.removeAssignment(courierId, deliveryId, options)
platform.completeDelivery(courierId, deliveryId, options)
platform.getCourierHistory(courierId)
platform.getMetrics()
```

---

## API Endpoints

Base path: `/api/v2/marketplace/delivery/couriers`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Platform health |
| GET | `/metrics` | Admin | Courier metrics |
| POST | `/` | Admin | Register courier |
| GET | `/` | Operational | List couriers |
| GET | `/:courierId` | Operational | Courier detail |
| PATCH | `/:courierId` | Admin | Update courier |
| POST | `/:courierId/activate` | Admin | Activate courier |
| POST | `/:courierId/deactivate` | Admin | Deactivate courier |
| PATCH | `/:courierId/availability` | Operational | Set availability |
| POST | `/:courierId/assign` | Operational | Assign delivery |
| DELETE | `/:courierId/assign/:deliveryId` | Operational | Remove assignment |
| GET | `/:courierId/history` | Operational | Courier history |

---

## Courier History

Immutable append-only events:

- Registration
- Profile updates
- Status changes
- Availability changes
- Assignments / reassignments
- Assignment removals
- Completed deliveries

---

## Observability

`CourierAnalytics` tracks:

- Registered couriers
- Assignments
- Assignment failures
- Availability changes
- Average capacity utilization
- Completed deliveries

---

## Out of Scope

- Driver mobile app
- GPS / maps / ETA
- Push notifications / SMS / email
- Driver earnings
- Fleet management
- External courier APIs
- Delivery pricing
- AI dispatch

---

## Verification

```bash
npm run test:courier
npm run verify:courier
```

Do not begin Delivery Pricing until explicitly scheduled.
